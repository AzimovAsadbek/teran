// Prepares a page film as a seamless loop (macOS: AVFoundation; ADR-037, docs/design/reference-
// assets.md section 5): the part [start, end] of the source, optionally mirrored, re-encoded as
// H.264 MP4 (no sound, fast start, Rec. 709) at a chosen bitrate.
//   dissolve: the last `fade` seconds dissolve into the first ones, so the file's end continues
//             into its beginning (length end - start - fade); a plain `loop` then has no seam.
//             With `zoom=rate,cx,cy` (a camera pushing in at `rate` per second about that point,
//             in fractions of the frame), both layers are scaled during the dissolve so they stay
//             aligned; the whole film is then magnified by exp(rate × length) to keep edges filled.
//             A dissolve shows two moments at once: where the camera or a hand moves, the
//             picture doubles for `fade` seconds (2026-10-19: all four home films did), so it
//             suits only still shots in which only small things move (steam, leaves).
//   bounce:   the part plays forwards then backwards (length 2 × (end - start)), for still scenes.
//             With `ease=speed`, the speed eases to a stop at each end (a cosine in time; `speed`
//             is the top speed, 1 = as filmed), so a drifting camera turns round smoothly and the
//             picture never doubles: for wind-blown leaves, not for anything poured or handled.
//   cut:      the part plays as it is; the browser's loop starts it again (a plain cut, best at
//             two frames that look alike): for moving shots that cannot play backwards.
// `fps` is the rate the part is read at (frames are taken at that rate); `play` the rate the file
// plays at: `fps=30 play=24` keeps every frame of a 30 fps film and slows it to 0.8×, with no
// frame repeated or blended (a calmer, longer flight from a short shot).
// Usage: swift loop-film.swift in=… out=… start=… end=… [fade=1.6] [mode=dissolve|bounce|cut]
//        [ease=1.15] [flip=1] [bitrate=1400000] [fps=25] [play=24] [zoom=0.024,0.475,0.44]
import AVFoundation
import CoreVideo
import Foundation

var options: [String: String] = [:]
for argument in CommandLine.arguments.dropFirst() {
  let parts = argument.split(separator: "=", maxSplits: 1).map(String.init)
  if parts.count == 2 { options[parts[0]] = parts[1] }
}
guard let input = options["in"], let output = options["out"], let start = Double(options["start"] ?? ""),
      let end = Double(options["end"] ?? "") else {
  print("usage: loop-film.swift in=… out=… start=… end=… [fade=] [mode=] [flip=] [bitrate=] [fps=] [play=] [zoom=]"); exit(2)
}
let fade = Double(options["fade"] ?? "1.6")!
let mode = options["mode"] ?? "dissolve"
let flip = options["flip"] == "1"
let bitrate = Int(options["bitrate"] ?? "1400000")!
let zoom = options["zoom"].map { $0.split(separator: ",").map { Double($0)! } }
let source = URL(fileURLWithPath: input)
let target = URL(fileURLWithPath: output)
try? FileManager.default.removeItem(at: target)

let asset = AVURLAsset(url: source)
guard let track = try await asset.loadTracks(withMediaType: .video).first else { print("no video"); exit(1) }
let (size, rate, transform) = try await track.load(.naturalSize, .nominalFrameRate, .preferredTransform)
guard transform == .identity else { print("rotated films are not handled"); exit(1) }
let fps = Int32(options["fps"] ?? "") ?? Int32(rate.rounded())
let play = Int32(options["play"] ?? "") ?? fps
let timescale: CMTimeScale = 600 * fps
func at(_ seconds: Double) -> CMTime { CMTime(seconds: seconds, preferredTimescale: timescale) }
let width = Int(size.width), height = Int(size.height)
let mirror = flip ? CGAffineTransform(a: -1, b: 0, c: 0, d: 1, tx: size.width, ty: 0) : .identity
/// Scaled by `scale` about the zoom centre, then mirrored when asked.
func placed(_ scale: Double) -> CGAffineTransform {
  guard let zoom, scale != 1 else { return mirror }
  let cx = zoom[1] * size.width, cy = zoom[2] * size.height
  return CGAffineTransform(translationX: -cx, y: -cy)
    .concatenating(CGAffineTransform(scaleX: scale, y: scale))
    .concatenating(CGAffineTransform(translationX: cx, y: cy))
    .concatenating(mirror)
}

let composition = AVMutableComposition()
let head = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
let video = AVMutableVideoComposition()
video.renderSize = size
video.frameDuration = CMTime(value: 1, timescale: fps)
video.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
video.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
video.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2
var length: CMTime
var tracks: [AVMutableCompositionTrack] = [head]

if mode == "dissolve" {
  // The head plays [start, end - fade); the tail [end - fade, end) lies over its first `fade`
  // seconds and dissolves away (smoothstep, in small linear steps), so frame 0 is the tail's first.
  let tail = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
  tracks.append(tail)
  try head.insertTimeRange(CMTimeRange(start: at(start), end: at(end - fade)), of: track, at: .zero)
  try tail.insertTimeRange(CMTimeRange(start: at(end - fade), end: at(end)), of: track, at: .zero)
  length = at(end - fade - start)
  // The tail is ahead of the head by the loop's length: magnified by k when the camera pushes in.
  let k = zoom.map { exp($0[0] * (end - fade - start)) } ?? 1
  let dissolve = CMTimeRange(start: .zero, duration: at(fade))
  let blend = AVMutableVideoCompositionInstruction()
  blend.timeRange = dissolve
  let over = AVMutableVideoCompositionLayerInstruction(assetTrack: tail)
  over.setTransformRamp(fromStart: placed(k), toEnd: placed(1), timeRange: dissolve)
  let steps = 12
  func smooth(_ x: Double) -> Float { Float(1 - (x * x * (3 - 2 * x))) }
  for step in 0..<steps {
    let a = Double(step) / Double(steps), b = Double(step + 1) / Double(steps)
    over.setOpacityRamp(fromStartOpacity: smooth(a), toEndOpacity: smooth(b),
                        timeRange: CMTimeRange(start: at(fade * a), end: at(fade * b)))
  }
  let under = AVMutableVideoCompositionLayerInstruction(assetTrack: head)
  under.setTransformRamp(fromStart: placed(k * k), toEnd: placed(k), timeRange: dissolve)
  blend.layerInstructions = [over, under]
  let rest = AVMutableVideoCompositionInstruction()
  rest.timeRange = CMTimeRange(start: at(fade), end: length)
  let only = AVMutableVideoCompositionLayerInstruction(assetTrack: head)
  only.setTransform(placed(k), at: at(fade))
  rest.layerInstructions = [only]
  video.instructions = [blend, rest]
  if k != 1 { print(String(format: "zoom compensation: whole film × %.3f, dissolve layers aligned", k)) }
} else {
  try head.insertTimeRange(CMTimeRange(start: at(start), end: at(end)), of: track, at: .zero)
  length = at(end - start)
  let whole = AVMutableVideoCompositionInstruction()
  whole.timeRange = CMTimeRange(start: .zero, duration: length)
  let only = AVMutableVideoCompositionLayerInstruction(assetTrack: head)
  only.setTransform(mirror, at: .zero)
  whole.layerInstructions = [only]
  video.instructions = [whole]
}

let reader = try AVAssetReader(asset: composition)
let frameOutput = AVAssetReaderVideoCompositionOutput(
  videoTracks: tracks,
  videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
frameOutput.videoComposition = video
frameOutput.alwaysCopiesSampleData = true
reader.add(frameOutput)
reader.timeRange = CMTimeRange(start: .zero, duration: length)

let writer = try AVAssetWriter(outputURL: target, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoColorPropertiesKey: [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
  ],
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: bitrate,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoMaxKeyFrameIntervalKey: Int(play) * 2,
    AVVideoExpectedSourceFrameRateKey: Int(play),
  ],
])
writerInput.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: nil)
writer.add(writerInput)
guard reader.startReading() else { print("reader:", reader.error as Any); exit(1) }
writer.startWriting()
writer.startSession(atSourceTime: .zero)

var written = 0
func write(_ buffer: CVPixelBuffer) {
  while !writerInput.isReadyForMoreMediaData { usleep(2000) }
  if !adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(written), timescale: play)) {
    print("append failed:", writer.error as Any); exit(1)
  }
  written += 1
}
// Only a bounce needs every frame at hand (4K frames are 33 MB each); the others are written as
// they are read.
var frames: [CVPixelBuffer] = []
while let sample = frameOutput.copyNextSampleBuffer() {
  guard let buffer = CMSampleBufferGetImageBuffer(sample) else { continue }
  if mode == "bounce" { frames.append(buffer) } else { write(buffer) }
}
if reader.status == .failed { print("reader failed:", reader.error as Any); exit(1) }
if mode == "bounce" && frames.count > 2 {
  if let speed = options["ease"].flatMap(Double.init), speed > 0 {
    // Position p(j) = last × (1 − cos 2πj/total) / 2: 0 → last → 0, its top speed π × last /
    // total frames per frame. Each output frame is the nearest filmed one (no blending).
    let last: Double = Double(frames.count - 1)
    let total: Int = Int((Double.pi * last / speed).rounded())
    func position(_ j: Int) -> Int {
      let turn: Double = 2 * Double.pi * Double(j) / Double(total)
      let p: Double = last * (1 - cos(turn)) / 2
      return Int(p.rounded())
    }
    let filmed = frames
    frames = (0..<total).map { (j: Int) -> CVPixelBuffer in filmed[position(j)] }
  } else {
    frames += frames[1..<(frames.count - 1)].reversed()
  }
}
for buffer in frames { write(buffer) }
writerInput.markAsFinished()
await writer.finishWriting()
if writer.status != .completed { print("writer:", writer.error as Any); exit(1) }
let bytes = (try FileManager.default.attributesOfItem(atPath: target.path)[.size] as? Int) ?? 0
print("\(target.lastPathComponent): \(width)×\(height) \(play) fps, \(written) frames = \(String(format: "%.2f", Double(written) / Double(play))) s, \(bytes / 1024) KB")
