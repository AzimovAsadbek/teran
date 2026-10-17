// Lifts the subject (a pack) off its photograph's background with Apple's Vision framework (the
// same on-device model as "Lift subject" in Photos) and writes a PNG with transparency.
// macOS 14 or later. Usage: swift scripts/packaging/lift-subject.swift <input> <output.png>
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
guard args.count == 3, let image = NSImage(contentsOfFile: args[1]),
      let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fatalError("usage: lift-subject <input> <output.png>")
}
let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([request])
guard let result = request.results?.first else { fatalError("no subject found") }
let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: false)
let ciImage = CIImage(cvPixelBuffer: buffer)
let context = CIContext()
guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else { fatalError("no sRGB") }
try context.writePNGRepresentation(of: ciImage, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: colorSpace)
print("instances: \(result.allInstances.count) → \(args[2])")
