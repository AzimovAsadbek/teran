// Writes a tiny upright film with a sound track for the end-to-end tests: 360×640, 2 s, 25 fps,
// a teal field with a light disc crossing it, and a soft 440 Hz tone (H.264 + AAC, fast start).
// Usage: swift e2e/scripts/make-test-reel.swift e2e/tests/support/fixtures/reel.mp4
import AVFoundation
import Foundation

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let work = FileManager.default.temporaryDirectory.appendingPathComponent("test-reel-\(getpid())")
try? FileManager.default.removeItem(at: work)
try FileManager.default.createDirectory(at: work, withIntermediateDirectories: true)
let silent = work.appendingPathComponent("silent.mp4"), tone = work.appendingPathComponent("tone.caf")
let width = 360, height = 640, fps: Int32 = 25, frames = 50

// 1. The picture.
let writer = try AVAssetWriter(outputURL: silent, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 250_000, AVVideoMaxKeyFrameIntervalKey: 25],
])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)
for frame in 0..<frames {
  var buffer: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
  let pixels = buffer!
  CVPixelBufferLockBaseAddress(pixels, [])
  let base = CVPixelBufferGetBaseAddress(pixels)!.assumingMemoryBound(to: UInt8.self)
  let row = CVPixelBufferGetBytesPerRow(pixels)
  let cx = Double(width) * (0.2 + 0.6 * Double(frame) / Double(frames - 1)), cy = Double(height) * 0.45
  for y in 0..<height {
    for x in 0..<width {
      let inside = (Double(x) - cx) * (Double(x) - cx) + (Double(y) - cy) * (Double(y) - cy) < 70 * 70
      let p = base + y * row + x * 4
      // BGRA: teal (#107e84) field, ivory disc.
      p[0] = inside ? 0xee : 0x84; p[1] = inside ? 0xf2 : 0x7e; p[2] = inside ? 0xf2 : 0x10; p[3] = 0xff
    }
  }
  CVPixelBufferUnlockBaseAddress(pixels, [])
  while !input.isReadyForMoreMediaData { usleep(1000) }
  adaptor.append(pixels, withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: fps))
}
input.markAsFinished()
await writer.finishWriting()
guard writer.status == .completed else { print("video:", writer.error as Any); exit(1) }

// 2. The sound: 2 s of 440 Hz at about -18 dBFS.
let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
let pcm = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 88_200)!
pcm.frameLength = 88_200
for i in 0..<Int(pcm.frameLength) { pcm.floatChannelData![0][i] = Float(0.125 * sin(2 * Double.pi * 440 * Double(i) / 44_100)) }
do { let file = try AVAudioFile(forWriting: tone, settings: format.settings); try file.write(from: pcm) }

// 3. Picture and sound together, as H.264 + AAC in an MP4.
let composition = AVMutableComposition()
let picture = AVURLAsset(url: silent), sound = AVURLAsset(url: tone)
let range = CMTimeRange(start: .zero, duration: CMTime(value: CMTimeValue(frames), timescale: fps))
let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
try videoTrack.insertTimeRange(range, of: try await picture.loadTracks(withMediaType: .video)[0], at: .zero)
let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
try audioTrack.insertTimeRange(range, of: try await sound.loadTracks(withMediaType: .audio)[0], at: .zero)
try? FileManager.default.removeItem(at: out)
let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality)!
export.outputURL = out
export.outputFileType = .mp4
export.shouldOptimizeForNetworkUse = true
await export.export()
guard export.status == .completed else { print("export:", export.error as Any); exit(1) }
try? FileManager.default.removeItem(at: work)
let bytes = (try FileManager.default.attributesOfItem(atPath: out.path)[.size] as? Int) ?? 0
print("\(out.lastPathComponent): \(width)×\(height), \(frames) frames, \(bytes / 1024) KB")
