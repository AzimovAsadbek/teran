// Writes the iPhone films the tests post (ADR-062), each 2 s at 30 fps with a stereo tone. The
// recordings are QuickTime movies as an iPhone camera writes them: the picture of an upright one
// stored on its side (640 × 360) with a 90° display matrix, AAC sound, a timed location track
// tied to the picture, and the make, model and place in the movie's header.
//
//   iphone-hevc-upright.mov      "High Efficiency" (the default): HEVC Main 10 in HLG, BT.2020
//   iphone-hevc-landscape.mov    ("HDR Video" is on by default)
//   iphone-h264-upright.mov      "Most Compatible": H.264, SDR
//   iphone-h264-landscape.mov
//   safari-upright.mov           what Safari on an iPhone hands a web page for the first one:
//                                WebKit exports a video chosen in the photo picker with
//                                AVAssetExportPresetHighestQuality to a QuickTime movie
//
// The pictures are a teal field with a light disc crossing it (made here, no camera footage).
// Usage: swift apps/api/scripts/make-iphone-films.swift apps/api/test/fixtures
import AVFoundation
import CoreMedia
import Foundation
import VideoToolbox

let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
let width = 640, height = 360, fps: Int32 = 30, frames = 60, sampleRate = 44_100
let place = "+41.0000+071.0000+400.000/"

/// A colour as video-range Y'CbCr samples: 10-bit BT.2020 for HDR, 8-bit BT.709 otherwise.
func ycbcr(_ r: Double, _ g: Double, _ b: Double, hdr: Bool) -> (UInt16, UInt16, UInt16) {
  if hdr {
    let y = 0.2627 * r + 0.6780 * g + 0.0593 * b
    return (UInt16(64 + 876 * y), UInt16(512 + 896 * (b - y) / 1.8814), UInt16(512 + 896 * (r - y) / 1.4746))
  }
  let y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return (UInt16(16 + 219 * y), UInt16(128 + 224 * (b - y) / 1.8556), UInt16(128 + 224 * (r - y) / 1.5748))
}

func metadataItem(_ identifier: AVMetadataIdentifier, _ value: String, _ type: CFString) -> AVMutableMetadataItem {
  let item = AVMutableMetadataItem()
  item.identifier = identifier
  item.value = value as NSString
  item.dataType = type as String
  return item
}

func record(_ out: URL, hdr: Bool, upright: Bool) async throws {
  try? FileManager.default.removeItem(at: out)
  let writer = try AVAssetWriter(outputURL: out, fileType: .mov)
  writer.metadata = [
    metadataItem(.quickTimeMetadataMake, "Apple", kCMMetadataBaseDataType_UTF8),
    metadataItem(.quickTimeMetadataModel, "iPhone 15 Pro", kCMMetadataBaseDataType_UTF8),
    metadataItem(.quickTimeMetadataSoftware, "18.0", kCMMetadataBaseDataType_UTF8),
    metadataItem(.quickTimeMetadataLocationISO6709, place, kCMMetadataDataType_QuickTimeMetadataLocation_ISO6709),
  ]

  let video = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: hdr ? AVVideoCodecType.hevc : AVVideoCodecType.h264,
    AVVideoWidthKey: width, AVVideoHeightKey: height,
    AVVideoColorPropertiesKey: hdr
      ? [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_2020,
         AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_2100_HLG,
         AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_2020]
      : [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
         AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
         AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
    AVVideoCompressionPropertiesKey: [
      AVVideoProfileLevelKey: hdr ? kVTProfileLevel_HEVC_Main10_AutoLevel as String : AVVideoProfileLevelH264HighAutoLevel,
      AVVideoAverageBitRateKey: 400_000, AVVideoMaxKeyFrameIntervalKey: 30,
      AVVideoExpectedSourceFrameRateKey: fps,
    ],
  ])
  video.expectsMediaDataInRealTime = false
  // Upright: the picture is stored as the sensor saw it and turned for display.
  if upright { video.transform = CGAffineTransform(a: 0, b: 1, c: -1, d: 0, tx: CGFloat(height), ty: 0) }
  let pixels = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: video, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: hdr
      ? kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange : kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
    kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
  ])
  writer.add(video)

  let audio = AVAssetWriterInput(mediaType: .audio, outputSettings: [
    AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: sampleRate, AVNumberOfChannelsKey: 2,
    AVEncoderBitRateKey: 128_000,
  ])
  audio.expectsMediaDataInRealTime = false
  writer.add(audio)

  // The place, as a timed metadata track tied to the picture (iPhones write several of these).
  var placeFormat: CMFormatDescription?
  CMMetadataFormatDescriptionCreateWithMetadataSpecifications(
    allocator: nil, metadataType: kCMMetadataFormatType_Boxed,
    metadataSpecifications: [[
      kCMMetadataFormatDescriptionMetadataSpecificationKey_Identifier: AVMetadataIdentifier.quickTimeMetadataLocationISO6709.rawValue,
      kCMMetadataFormatDescriptionMetadataSpecificationKey_DataType: kCMMetadataDataType_QuickTimeMetadataLocation_ISO6709,
    ]] as CFArray, formatDescriptionOut: &placeFormat)
  let timed = AVAssetWriterInput(mediaType: .metadata, outputSettings: nil, sourceFormatHint: placeFormat)
  let timedAdaptor = AVAssetWriterInputMetadataAdaptor(assetWriterInput: timed)
  writer.add(timed)
  timed.addTrackAssociation(withTrackOf: video, type: AVAssetTrack.AssociationType.metadataReferent.rawValue)

  guard writer.startWriting() else { throw writer.error ?? CocoaError(.fileWriteUnknown) }
  writer.startSession(atSourceTime: .zero)

  let field = ycbcr(0.10, 0.45, 0.47, hdr: hdr), disc = ycbcr(0.95, 0.93, 0.88, hdr: hdr)
  // 10-bit samples sit in the high bits of 16; 8-bit ones are bytes.
  func picture(_ frame: Int) -> CVPixelBuffer {
    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pixels.pixelBufferPool!, &buffer)
    let picture = buffer!
    if hdr {
      CVBufferSetAttachment(picture, kCVImageBufferColorPrimariesKey, kCVImageBufferColorPrimaries_ITU_R_2020, .shouldPropagate)
      CVBufferSetAttachment(picture, kCVImageBufferTransferFunctionKey, kCVImageBufferTransferFunction_ITU_R_2100_HLG, .shouldPropagate)
      CVBufferSetAttachment(picture, kCVImageBufferYCbCrMatrixKey, kCVImageBufferYCbCrMatrix_ITU_R_2020, .shouldPropagate)
    } else {
      CVBufferSetAttachment(picture, kCVImageBufferColorPrimariesKey, kCVImageBufferColorPrimaries_ITU_R_709_2, .shouldPropagate)
      CVBufferSetAttachment(picture, kCVImageBufferTransferFunctionKey, kCVImageBufferTransferFunction_ITU_R_709_2, .shouldPropagate)
      CVBufferSetAttachment(picture, kCVImageBufferYCbCrMatrixKey, kCVImageBufferYCbCrMatrix_ITU_R_709_2, .shouldPropagate)
    }
    CVPixelBufferLockBaseAddress(picture, [])
    let cx = Double(width) * (0.2 + 0.6 * Double(frame) / Double(frames - 1)), cy = Double(height) * 0.5
    func colour(_ x: Int, _ y: Int) -> (UInt16, UInt16, UInt16) {
      (Double(x) - cx) * (Double(x) - cx) + (Double(y) - cy) * (Double(y) - cy) < 90 * 90 ? disc : field
    }
    let lumaRow = CVPixelBufferGetBytesPerRowOfPlane(picture, 0), chromaRow = CVPixelBufferGetBytesPerRowOfPlane(picture, 1)
    let luma = CVPixelBufferGetBaseAddressOfPlane(picture, 0)!, chroma = CVPixelBufferGetBaseAddressOfPlane(picture, 1)!
    for y in 0..<height {
      for x in 0..<width {
        let value = colour(x, y).0
        if hdr { luma.storeBytes(of: value << 6, toByteOffset: y * lumaRow + x * 2, as: UInt16.self) }
        else { luma.storeBytes(of: UInt8(value), toByteOffset: y * lumaRow + x, as: UInt8.self) }
      }
    }
    for y in 0..<(height / 2) {
      for x in 0..<(width / 2) {
        let value = colour(x * 2, y * 2)
        if hdr {
          chroma.storeBytes(of: value.1 << 6, toByteOffset: y * chromaRow + x * 4, as: UInt16.self)
          chroma.storeBytes(of: value.2 << 6, toByteOffset: y * chromaRow + x * 4 + 2, as: UInt16.self)
        } else {
          chroma.storeBytes(of: UInt8(value.1), toByteOffset: y * chromaRow + x * 2, as: UInt8.self)
          chroma.storeBytes(of: UInt8(value.2), toByteOffset: y * chromaRow + x * 2 + 1, as: UInt8.self)
        }
      }
    }
    CVPixelBufferUnlockBaseAddress(picture, [])
    return picture
  }

  // 2 s of 440 Hz on the left and 660 Hz on the right, at about -18 dBFS.
  var pcm = AudioStreamBasicDescription(
    mSampleRate: Float64(sampleRate), mFormatID: kAudioFormatLinearPCM,
    mFormatFlags: kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked,
    mBytesPerPacket: 4, mFramesPerPacket: 1, mBytesPerFrame: 4, mChannelsPerFrame: 2,
    mBitsPerChannel: 16, mReserved: 0)
  var soundFormat: CMAudioFormatDescription?
  CMAudioFormatDescriptionCreate(allocator: nil, asbd: &pcm, layoutSize: 0, layout: nil, magicCookieSize: 0,
                                 magicCookie: nil, extensions: nil, formatDescriptionOut: &soundFormat)
  let total = sampleRate * Int(frames) / Int(fps), chunk = 1024
  func sound(_ start: Int) -> CMSampleBuffer {
    let count = min(chunk, total - start)
    var samples = [Int16](repeating: 0, count: count * 2)
    for i in 0..<count {
      let t = Double(start + i) / Double(sampleRate)
      samples[i * 2] = Int16(4000 * sin(2 * Double.pi * 440 * t))
      samples[i * 2 + 1] = Int16(4000 * sin(2 * Double.pi * 660 * t))
    }
    var block: CMBlockBuffer?
    CMBlockBufferCreateWithMemoryBlock(allocator: nil, memoryBlock: nil, blockLength: count * 4, blockAllocator: nil,
                                       customBlockSource: nil, offsetToData: 0, dataLength: count * 4, flags: 0,
                                       blockBufferOut: &block)
    samples.withUnsafeBytes { bytes in
      _ = CMBlockBufferReplaceDataBytes(with: bytes.baseAddress!, blockBuffer: block!, offsetIntoDestination: 0,
                                        dataLength: count * 4)
    }
    var sample: CMSampleBuffer?
    CMAudioSampleBufferCreateReadyWithPacketDescriptions(
      allocator: nil, dataBuffer: block!, formatDescription: soundFormat!, sampleCount: count,
      presentationTimeStamp: CMTime(value: CMTimeValue(start), timescale: CMTimeScale(sampleRate)),
      packetDescriptions: nil, sampleBufferOut: &sample)
    return sample!
  }

  let location = metadataItem(.quickTimeMetadataLocationISO6709, place, kCMMetadataDataType_QuickTimeMetadataLocation_ISO6709)
  let whole = CMTimeRange(start: .zero, duration: CMTime(value: CMTimeValue(frames), timescale: fps))

  // The writer interleaves the tracks: an input takes more only once the others have caught up.
  var frame = 0, start = 0, placed = false
  while frame < frames || start < total || !placed {
    var progressed = false
    if frame < frames && video.isReadyForMoreMediaData {
      pixels.append(picture(frame), withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: fps))
      frame += 1
      if frame == frames { video.markAsFinished() }
      progressed = true
    }
    if start < total && audio.isReadyForMoreMediaData {
      audio.append(sound(start))
      start += chunk
      if start >= total { audio.markAsFinished() }
      progressed = true
    }
    if !placed && timed.isReadyForMoreMediaData {
      timedAdaptor.append(AVTimedMetadataGroup(items: [location], timeRange: whole))
      timed.markAsFinished()
      placed = true
      progressed = true
    }
    if !progressed { usleep(1000) }
  }

  await writer.finishWriting()
  guard writer.status == .completed else { throw writer.error ?? CocoaError(.fileWriteUnknown) }
}

/// What WebKit does with a video chosen in Safari's photo picker (WKFileUploadMediaTranscoder).
func exportAsSafariDoes(_ source: URL, _ out: URL) async throws {
  try? FileManager.default.removeItem(at: out)
  guard let export = AVAssetExportSession(asset: AVURLAsset(url: source), presetName: AVAssetExportPresetHighestQuality)
  else { throw CocoaError(.featureUnsupported) }
  try await export.export(to: out, as: .mov)
}

var written: [URL] = []
for (codec, hdr) in [("hevc", true), ("h264", false)] {
  for (shape, upright) in [("upright", true), ("landscape", false)] {
    let out = directory.appendingPathComponent("iphone-\(codec)-\(shape).mov")
    try await record(out, hdr: hdr, upright: upright)
    written.append(out)
  }
}
let safari = directory.appendingPathComponent("safari-upright.mov")
try await exportAsSafariDoes(directory.appendingPathComponent("iphone-hevc-upright.mov"), safari)
written.append(safari)
for file in written {
  let bytes = (try FileManager.default.attributesOfItem(atPath: file.path)[.size] as? Int) ?? 0
  print("\(file.lastPathComponent): \(bytes / 1024) KB")
}
