// How a film's picture drifts, for square-loop.swift (macOS: AVFoundation, Vision; ADR-053): for
// each frame in [start, end], the content's displacement (source px, top-left origin, x right,
// y down) from the first frame, measured in a region of interest with Vision's translational
// registration between consecutive frames (summed up). Choose the region on the subject and what
// stands still around it: a camera arcing round a cup moves the foreground the other way, and
// steam, a hand or a lid in the region throws the measure off.
// Usage: swift track-drift.swift in=… start=… end=… roi=x,y,w,h [scale=0.5] [ref=first] > drift.csv
import AVFoundation
import CoreImage
import Foundation
import Vision

var o: [String: String] = [:]
for a in CommandLine.arguments.dropFirst() { let p = a.split(separator: "=", maxSplits: 1).map(String.init); if p.count == 2 { o[p[0]] = p[1] } }
let asset = AVURLAsset(url: URL(fileURLWithPath: o["in"]!))
guard let track = try await asset.loadTracks(withMediaType: .video).first else { print("no video"); exit(1) }
let size = try await track.load(.naturalSize)
let start = Double(o["start"]!)!, end = Double(o["end"]!)!
let roi = o["roi"]!.split(separator: ",").map { Double($0)! }
let scale = Double(o["scale"] ?? "0.25")!
let reader = try AVAssetReader(asset: asset)
reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 6000), end: CMTime(seconds: end, preferredTimescale: 6000))
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(output)
reader.startReading()
let context = CIContext(options: [.useSoftwareRenderer: false])
// Core Image's origin is bottom-left: the region's rectangle counted from the bottom.
let region = CGRect(x: roi[0], y: Double(size.height) - roi[1] - roi[3], width: roi[2], height: roi[3])
var previous: CGImage?
var first: CGImage?
// ref=first: every frame against the segment's first (no drift summed up; small moves only).
let againstFirst = o["ref"] == "first"
var x = 0.0, y = 0.0
print("t,dx,dy")
while let sample = output.copyNextSampleBuffer() {
  guard let buffer = CMSampleBufferGetImageBuffer(sample) else { continue }
  let t = CMSampleBufferGetPresentationTimeStamp(sample).seconds
  let image = CIImage(cvPixelBuffer: buffer).cropped(to: region)
    .transformed(by: CGAffineTransform(translationX: -region.minX, y: -region.minY))
    .transformed(by: CGAffineTransform(scaleX: scale, y: scale))
  guard let current = context.createCGImage(image, from: CGRect(x: 0, y: 0, width: region.width * scale, height: region.height * scale)) else { continue }
  if let reference = againstFirst ? first : previous {
    let request = VNTranslationalImageRegistrationRequest(targetedCGImage: current)
    try VNImageRequestHandler(cgImage: reference).perform([request])
    if let observation = request.results?.first as? VNImageTranslationAlignmentObservation {
      // The transform that lays the current frame onto the reference: the content moved by its
      // opposite. Vision counts y upwards.
      let dx = -Double(observation.alignmentTransform.tx) / scale
      let dy = Double(observation.alignmentTransform.ty) / scale
      if againstFirst { x = dx; y = dy } else { x += dx; y += dy }
    }
  }
  if first == nil { first = current }
  print(String(format: "%.4f,%.2f,%.2f", t - start, x, y))
  previous = current
}
