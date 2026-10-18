// Encodes raw RGB frames (one file: count × width × height × 3 bytes) as an H.264 MP4 (no sound,
// fast start, Rec. 709; macOS, ADR-038), one key frame per loop unless `keyint` says otherwise.
// Usage: swift frames-to-film.swift in=frames.rgb out=film.mp4 width=1024 height=1024 fps=24
//   bitrate=2000000 [keyint=48]
import AVFoundation
import CoreVideo
import Foundation

var o: [String: String] = [:]
for a in CommandLine.arguments.dropFirst() { let p = a.split(separator: "=", maxSplits: 1).map(String.init); if p.count == 2 { o[p[0]] = p[1] } }
let input = URL(fileURLWithPath: o["in"]!), output = URL(fileURLWithPath: o["out"]!)
let width = Int(o["width"]!)!, height = Int(o["height"]!)!, fps = Int32(o["fps"] ?? "24")!, bitrate = Int(o["bitrate"] ?? "2000000")!
try? FileManager.default.removeItem(at: output)
let data = try Data(contentsOf: input, options: .alwaysMapped)
let frameBytes = width * height * 3

let count = data.count / frameBytes
// One key frame per loop by default: the still parts are then the same in every frame, so the
// loop's wrap (back to the key frame) shows no change in them.
let keyint = Int(o["keyint"] ?? "") ?? count
let compression: [String: Any] = [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: keyint, AVVideoExpectedSourceFrameRateKey: Int(fps)]
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
  AVVideoCompressionPropertiesKey: compression,
])
writerInput.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
])
writer.add(writerInput)
writer.startWriting()
writer.startSession(atSourceTime: .zero)
for index in 0..<count {
  while !writerInput.isReadyForMoreMediaData { usleep(2000) }
  var buffer: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
  guard let pb = buffer else { print("no buffer"); exit(1) }
  CVPixelBufferLockBaseAddress(pb, [])
  let base = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
  let stride = CVPixelBufferGetBytesPerRow(pb)
  data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
    let src = raw.baseAddress!.assumingMemoryBound(to: UInt8.self) + index * frameBytes
    for y in 0..<height {
      let row = base + y * stride
      let srow = src + y * width * 3
      for x in 0..<width {
        row[x * 4] = srow[x * 3 + 2]; row[x * 4 + 1] = srow[x * 3 + 1]; row[x * 4 + 2] = srow[x * 3]; row[x * 4 + 3] = 255
      }
    }
  }
  CVPixelBufferUnlockBaseAddress(pb, [])
  if !adaptor.append(pb, withPresentationTime: CMTime(value: CMTimeValue(index), timescale: fps)) { print("append failed", writer.error as Any); exit(1) }
}
writerInput.markAsFinished()
await writer.finishWriting()
if writer.status != .completed { print("writer", writer.error as Any); exit(1) }
let bytes = (try FileManager.default.attributesOfItem(atPath: output.path)[.size] as? Int) ?? 0
print("\(output.lastPathComponent): \(width)×\(height) \(fps) fps, \(count) frames = \(String(format: "%.2f", Double(count) / Double(fps))) s, \(bytes / 1024) KB")
