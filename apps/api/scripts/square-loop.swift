// A product picture's film (macOS: AVFoundation, Core Image; ADR-053): a square, seamlessly
// looping part of a source film. The square `crop=x,y,s` (source px, top-left origin) at the
// part's start is moved with the picture's drift (`track=csv` from track-drift.swift, smoothed
// over `smooth` seconds; measure it on the subject, not on the foreground) so the subject
// stays put, scaled with Lanczos to `size` (and to `cardSize` for a second, lighter copy). The
// part's last `fade` seconds dissolve into its first ones (smoothstep), so the file's end runs
// into its beginning; `fade=0` plays the part as it is (a cut). `play` is the rate the file plays
// at (frames are kept, none repeated or blended: play=24 slows a 30 fps part to 0.8×). `poster`
// writes the film's first frame as a JPEG at `size`. `tone=brightness,contrast,saturation,warmth`
// grades every frame alike (Core Image colour controls; warmth in kelvin added to 6500).
// storage/tea-films-3/manifest.json records each tea film's settings.
// Usage: swift square-loop.swift in=… start=… end=… crop=x,y,s out=… size=1440 [bitrate=4000000]
//        [track=…] [smooth=0.6] [fade=0.8] [play=24] [card=… cardSize=720 cardBitrate=1200000]
//        [poster=….jpg] [sharpen=0.25] [tone=0,1,1,0]
import AVFoundation
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers

var o: [String: String] = [:]
for a in CommandLine.arguments.dropFirst() { let p = a.split(separator: "=", maxSplits: 1).map(String.init); if p.count == 2 { o[p[0]] = p[1] } }
func number(_ key: String, _ fallback: Double) -> Double { o[key].flatMap(Double.init) ?? fallback }
let source = URL(fileURLWithPath: o["in"]!)
let start = number("start", 0), end = number("end", 0), fade = number("fade", 0.8)
let crop = o["crop"]!.split(separator: ",").map { Double($0)! }
let size = Int(number("size", 1440)), cardSize = Int(number("cardSize", 720))
let bitrate = Int(number("bitrate", 4_000_000)), cardBitrate = Int(number("cardBitrate", 1_200_000))
let sharpen = number("sharpen", 0.25), smooth = number("smooth", 0.6)
let tone = (o["tone"] ?? "0,1,1,0").split(separator: ",").map { Double($0)! }

let asset = AVURLAsset(url: source)
guard let track = try await asset.loadTracks(withMediaType: .video).first else { print("no video"); exit(1) }
let (natural, rate, transform) = try await track.load(.naturalSize, .nominalFrameRate, .preferredTransform)
guard transform == .identity else { print("rotated films are not handled"); exit(1) }
let frameRate = Double(rate)
let play = Int32(number("play", frameRate.rounded()))
let H = Double(natural.height), W = Double(natural.width)

// The drift: (t, dx, dy) from the part's start, smoothed by a centred moving average.
var drift: [(t: Double, x: Double, y: Double)] = []
if let path = o["track"] {
  let rows = try String(contentsOfFile: path, encoding: .utf8).split(separator: "\n").dropFirst()
  let raw = rows.map { $0.split(separator: ",").map { Double($0)! } }.map { (t: $0[0], x: $0[1], y: $0[2]) }
  drift = raw.map { row in
    let near = raw.filter { abs($0.t - row.t) <= smooth / 2 }
    return (row.t, near.map(\.x).reduce(0, +) / Double(near.count), near.map(\.y).reduce(0, +) / Double(near.count))
  }
}
func shift(_ t: Double) -> (Double, Double) {
  guard let first = drift.first, let last = drift.last else { return (0, 0) }
  if t <= first.t { return (first.x, first.y) }
  if t >= last.t { return (last.x, last.y) }
  let i = drift.firstIndex { $0.t >= t }!
  let a = drift[i - 1], b = drift[i], f = (t - a.t) / (b.t - a.t)
  return (a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f)
}
var clamped = 0
/// The square at `t` seconds into the part, in Core Image coordinates (origin bottom-left).
func square(_ t: Double) -> CGRect {
  let (dx, dy) = shift(t)
  let s = crop[2]
  var x = crop[0] + dx, y = crop[1] + dy
  if x < 0 || y < 0 || x + s > W || y + s > H { clamped += 1 }
  x = min(max(x, 0), W - s); y = min(max(y, 0), H - s)
  return CGRect(x: x, y: H - y - s, width: s, height: s)
}

let context = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.itur_709)!])
func render(_ image: CIImage, t: Double, to side: Int) -> CIImage {
  let rect = square(t)
  var out = image.cropped(to: rect).transformed(by: CGAffineTransform(translationX: -rect.minX, y: -rect.minY))
  out = out.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: Double(side) / rect.width, kCIInputAspectRatioKey: 1])
  if tone != [0, 1, 1, 0] {
    out = out.applyingFilter("CIColorControls", parameters: [kCIInputBrightnessKey: tone[0], kCIInputContrastKey: tone[1], kCIInputSaturationKey: tone[2]])
    if tone[3] != 0 {
      out = out.applyingFilter("CITemperatureAndTint", parameters: ["inputNeutral": CIVector(x: 6500, y: 0), "inputTargetNeutral": CIVector(x: 6500 + tone[3], y: 0)])
    }
  }
  if sharpen > 0 { out = out.applyingFilter("CISharpenLuminance", parameters: [kCIInputSharpnessKey: sharpen, kCIInputRadiusKey: 1.2]) }
  return out.cropped(to: CGRect(x: 0, y: 0, width: side, height: side))
}

/// Every frame of [from, to) (seconds into the source), with its time from the part's start.
func frames(_ from: Double, _ to: Double, _ body: (CIImage, Double) throws -> Void) throws {
  let reader = try AVAssetReader(asset: asset)
  reader.timeRange = CMTimeRange(start: CMTime(seconds: from, preferredTimescale: 60000), end: CMTime(seconds: to, preferredTimescale: 60000))
  let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
  reader.add(output)
  reader.startReading()
  while let sample = output.copyNextSampleBuffer() {
    guard let buffer = CMSampleBufferGetImageBuffer(sample) else { continue }
    let t = CMSampleBufferGetPresentationTimeStamp(sample).seconds
    if t < from - 0.001 || t >= to - 0.001 { continue }
    try autoreleasepool { try body(CIImage(cvPixelBuffer: buffer), t - start) }
  }
  if reader.status == .failed { throw reader.error! }
}

final class Film {
  let writer: AVAssetWriter, input: AVAssetWriterInput, adaptor: AVAssetWriterInputPixelBufferAdaptor, side: Int
  init(_ path: String, side: Int, bitrate: Int, frames: Int) throws {
    let url = URL(fileURLWithPath: path)
    try? FileManager.default.removeItem(at: url)
    self.side = side
    writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true
    input = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: side, AVVideoHeightKey: side,
      AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
      AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: frames, AVVideoExpectedSourceFrameRateKey: Int(play)],
    ])
    input.expectsMediaDataInRealTime = false
    adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: side, kCVPixelBufferHeightKey as String: side,
    ])
    writer.add(input)
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)
  }
  func append(_ image: CIImage, index: Int) {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
    context.render(image, to: buffer!, bounds: CGRect(x: 0, y: 0, width: side, height: side), colorSpace: CGColorSpace(name: CGColorSpace.itur_709)!)
    adaptor.append(buffer!, withPresentationTime: CMTime(value: CMTimeValue(index), timescale: play))
  }
  func finish() async {
    input.markAsFinished()
    await writer.finishWriting()
  }
}

let length = end - start - fade
let count = Int((length * frameRate).rounded())
var films = [try Film(o["out"]!, side: size, bitrate: bitrate, frames: count)]
if let card = o["card"] { films.append(try Film(card, side: cardSize, bitrate: cardBitrate, frames: count)) }

// The tail: the part's last `fade` seconds, rendered (it lies over the head's first ones).
var tail: [[CIImage]] = films.map { _ in [] }
if fade > 0 {
  try frames(end - fade, end) { image, t in
    for (i, film) in films.enumerated() {
      // Rendered into memory now: the reader's buffer is reused once this frame is done.
      let rendered = render(image, t: t, to: film.side)
      tail[i].append(CIImage(cgImage: context.createCGImage(rendered, from: rendered.extent, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.itur_709)!)!))
    }
  }
}
var index = 0
try frames(start, end - fade) { image, t in
  guard index < count else { return }
  for (i, film) in films.enumerated() {
    var frame = render(image, t: t, to: film.side)
    if index < tail[i].count {
      let p = Double(index) / Double(tail[i].count)
      let weight = 1 - p * p * (3 - 2 * p)
      let over = tail[i][index].applyingFilter("CIColorMatrix", parameters: ["inputAVector": CIVector(x: 0, y: 0, z: 0, w: weight)])
      frame = over.composited(over: frame)
    }
    if index == 0, i == 0, let poster = o["poster"] {
      let cg = context.createCGImage(frame, from: frame.extent, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)!
      let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: poster) as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
      CGImageDestinationAddImage(dest, cg, [kCGImageDestinationLossyCompressionQuality: 0.92] as CFDictionary)
      CGImageDestinationFinalize(dest)
    }
    film.append(frame, index: index)
  }
  index += 1
}
for film in films { await film.finish() }
print(String(format: "%d frames, %.2f s at %d fps (part %.2f–%.2f s, fade %.2f s)%@", index, Double(index) / Double(play), play, start, end, fade, clamped > 0 ? ", square kept inside the frame \(clamped) times" : ""))
