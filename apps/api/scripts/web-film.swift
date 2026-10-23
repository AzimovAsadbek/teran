// Re-encodes a 4K film for the gallery and the home page's social band (macOS; ADR-056): scaled
// down with Lanczos and sharpened a little (Core Image, colours untouched), cropped to an exact
// aspect in the middle, trimmed, its frame rate halved where it is 50 or 60, a key frame every two
// seconds (the viewer can seek), H.264 High in MP4 without sound (the site's films play muted).
// The first frame is written as the poster (JPEG) beside it.
// Usage: swift web-film.swift in=… out=… poster=… width=1080 [aspect=9:16] [start=0] [duration=…]
//   [bitrate=6000000] [sharpness=0.25]
import AVFoundation
import CoreImage
import Foundation

var o: [String: String] = [:]
for a in CommandLine.arguments.dropFirst() { let p = a.split(separator: "=", maxSplits: 1).map(String.init); if p.count == 2 { o[p[0]] = p[1] } }
let input = URL(fileURLWithPath: o["in"]!), output = URL(fileURLWithPath: o["out"]!)
let posterURL = o["poster"].map { URL(fileURLWithPath: $0) }
let targetWidth = Double(o["width"] ?? "1080")!, bitrate = Int(o["bitrate"] ?? "6000000")!
let sharpness = Double(o["sharpness"] ?? "0.25")!
let start = Double(o["start"] ?? "0")!
try? FileManager.default.removeItem(at: output)
let asset = AVURLAsset(url: input)
guard let track = try await asset.loadTracks(withMediaType: .video).first else { print("no video"); exit(1) }
let (size, rate, total) = try await (track.load(.naturalSize), track.load(.nominalFrameRate), asset.load(.duration))
let duration = Double(o["duration"] ?? "\(total.seconds - start)")!
// 50 and 60 frames a second become 25 and 30: every other frame is kept.
let step = rate > 40 ? 2 : 1
let fps = Int32((Double(rate) / Double(step)).rounded())
let scale = targetWidth / Double(size.width)
let scaledWidth = Double(size.width) * scale, scaledHeight = Double(size.height) * scale
// The frame: the scaled picture, or its middle at the given aspect; even sides for H.264.
let aspect = o["aspect"].map { $0.split(separator: ":").map { Double($0)! } }
let width = Int(scaledWidth.rounded()) / 2 * 2
let height = aspect.map { a in Int((Double(width) * a[1] / a[0]).rounded()) / 2 * 2 } ?? Int(scaledHeight.rounded()) / 2 * 2
guard Double(height) <= scaledHeight + 1 else { print("the film is too short for that aspect"); exit(1) }
let top = (scaledHeight - Double(height)) / 2
let reader = try AVAssetReader(asset: asset)
reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), duration: CMTime(seconds: duration, preferredTimescale: 600))
let readerOutput = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(readerOutput)
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2, AVVideoExpectedSourceFrameRateKey: Int(fps)],
])
writerInput.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
])
writer.add(writerInput)
guard reader.startReading() else { print("reader", reader.error as Any); exit(1) }
writer.startWriting()
writer.startSession(atSourceTime: .zero)
// No colour management: the pixels keep their values, only their size and edges change.
let context = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
var read = 0, written = 0
while let sample = readerOutput.copyNextSampleBuffer() {
  guard let pixels = CMSampleBufferGetImageBuffer(sample) else { continue }
  defer { read += 1 }
  if read % step != 0 { continue }
  // Core Image's origin is at the bottom left; the crop keeps the middle band.
  let image = CIImage(cvPixelBuffer: pixels)
    .applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: scale, kCIInputAspectRatioKey: 1.0])
    .applyingFilter("CISharpenLuminance", parameters: [kCIInputSharpnessKey: sharpness])
    .cropped(to: CGRect(x: 0, y: top, width: Double(width), height: Double(height)))
    .transformed(by: CGAffineTransform(translationX: 0, y: -top))
  while !writerInput.isReadyForMoreMediaData { usleep(2000) }
  var buffer: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
  guard let out = buffer else { print("no buffer"); exit(1) }
  context.render(image, to: out)
  if written == 0, let posterURL {
    let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
    try CIContext().writeJPEGRepresentation(of: CIImage(cvPixelBuffer: out), to: posterURL, colorSpace: srgb, options: [CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String): 0.92])
  }
  if !adaptor.append(out, withPresentationTime: CMTime(value: CMTimeValue(written), timescale: fps)) { print("append", writer.error as Any); exit(1) }
  written += 1
}
writerInput.markAsFinished()
await writer.finishWriting()
if writer.status != .completed { print("writer", writer.error as Any); exit(1) }
let bytes = (try FileManager.default.attributesOfItem(atPath: output.path)[.size] as? Int) ?? 0
print("\(output.lastPathComponent): \(width)×\(height) \(fps) fps, \(written) frames (\(String(format: "%.1f", Double(written) / Double(fps))) s), \(bytes / 1024) KB")
