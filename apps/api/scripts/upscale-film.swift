// Re-encodes a (looping) film larger and crisper (macOS; ADR-038): each frame scaled with Lanczos
// and sharpened a little (Core Image, colours untouched), one key frame per loop, H.264 MP4 at a
// chosen bitrate.
// Usage: swift upscale-film.swift in=… out=… scale=2 bitrate=2000000 [sharpness=0.45] [radius=1.3]
//   [crop=x,y,w,h] (a part of the scaled frame, e.g. what a phone shows)
import AVFoundation
import CoreImage
import Foundation

var o: [String: String] = [:]
for a in CommandLine.arguments.dropFirst() { let p = a.split(separator: "=", maxSplits: 1).map(String.init); if p.count == 2 { o[p[0]] = p[1] } }
let input = URL(fileURLWithPath: o["in"]!), output = URL(fileURLWithPath: o["out"]!)
let scale = Double(o["scale"] ?? "2")!, bitrate = Int(o["bitrate"] ?? "2000000")!
let sharpness = Double(o["sharpness"] ?? "0.45")!, radius = Double(o["radius"] ?? "1.3")!
try? FileManager.default.removeItem(at: output)
let asset = AVURLAsset(url: input)
guard let track = try await asset.loadTracks(withMediaType: .video).first else { print("no video"); exit(1) }
let (size, rate, duration) = try await (track.load(.naturalSize), track.load(.nominalFrameRate), asset.load(.duration))
let fps = Int32(rate.rounded())
let count = Int((duration.seconds * Double(fps)).rounded())
// Even dimensions for H.264; a crop keeps only part of the scaled frame.
let crop = o["crop"].map { $0.split(separator: ",").map { Int($0)! } }
let width = crop.map { $0[2] / 2 * 2 } ?? Int((size.width * scale / 2).rounded()) * 2
let height = crop.map { $0[3] / 2 * 2 } ?? Int((size.height * scale / 2).rounded()) * 2
let scaledHeight = Double(size.height) * scale
let reader = try AVAssetReader(asset: asset)
let readerOutput = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(readerOutput)
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: max(count, 1), AVVideoExpectedSourceFrameRateKey: Int(fps)],
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
var index = 0
while let sample = readerOutput.copyNextSampleBuffer() {
  guard let pixels = CMSampleBufferGetImageBuffer(sample) else { continue }
  let image = CIImage(cvPixelBuffer: pixels)
    .applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: scale, kCIInputAspectRatioKey: 1.0])
    .applyingFilter("CISharpenLuminance", parameters: [kCIInputSharpnessKey: sharpness, kCIInputRadiusKey: radius])
  // Core Image's origin is at the bottom left: a crop from the top is measured from there.
  let cropped = crop.map { c in
    image.cropped(to: CGRect(x: c[0], y: Int(scaledHeight) - c[1] - height, width: width, height: height))
      .transformed(by: CGAffineTransform(translationX: CGFloat(-c[0]), y: CGFloat(-(Int(scaledHeight) - c[1] - height))))
  } ?? image.cropped(to: CGRect(x: 0, y: 0, width: width, height: height))
  while !writerInput.isReadyForMoreMediaData { usleep(2000) }
  var buffer: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
  guard let out = buffer else { print("no buffer"); exit(1) }
  context.render(cropped, to: out)
  if !adaptor.append(out, withPresentationTime: CMTime(value: CMTimeValue(index), timescale: fps)) { print("append", writer.error as Any); exit(1) }
  index += 1
}
writerInput.markAsFinished()
await writer.finishWriting()
if writer.status != .completed { print("writer", writer.error as Any); exit(1) }
let bytes = (try FileManager.default.attributesOfItem(atPath: output.path)[.size] as? Int) ?? 0
print("\(output.lastPathComponent): \(width)×\(height) \(fps) fps, \(index) frames, \(bytes / 1024) KB")
