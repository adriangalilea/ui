// Where the person IS in a picture, as JSON on stdout. Nothing else: no cropping, no
// resizing, no file writing — the caller owns all of that, and this owns the one thing
// no amount of arithmetic can work out, which is where a face is.
//
// Swift because Vision is Apple's, and Swift is the only binding to it that needs no
// glue: `swift portrait.swift <image>…` runs interpreted, so there is nothing to build
// and nothing to install beyond the Command Line Tools. The cost is honest and worth
// stating — it is a second language in a TypeScript repo, and it is macOS only. It is
// tooling for PREPARING an asset, never something the component needs.
//
// Boxes come back in Vision's own convention: normalised 0…1, origin BOTTOM-left. The
// caller flips them, because the caller is the one placing pixels.

import CoreGraphics
import Foundation
import ImageIO
import Vision

struct Box: Encodable {
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    init(_ r: CGRect) {
        x = r.origin.x
        y = r.origin.y
        w = r.size.width
        h = r.size.height
    }
}

struct Found: Encodable {
    let path: String
    let width: Int
    let height: Int
    /// The largest face, when there is one. Absent for statues, busts, line drawings
    /// and most paintings, which is exactly why the salient box exists beside it.
    let face: Box?
    /// What an attention model says the picture is ABOUT. This is the fallback X and
    /// Cloudflare's `gravity=auto` use, and it is the reason Twitter moved off face
    /// detection: it answers for pictures that have no face to find.
    let salient: Box?
}

var out: [Found] = []
for path in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: path)
    // A file that cannot be read is SKIPPED, loudly, not fatal: this runs over whole
    // corpora, and one truncated avatar among forty-three killing the entire batch —
    // with every already-computed answer discarded — is a worse failure than one card
    // falling back to a centred focus. The caller sees the note on stderr and gets no
    // entry for the path, which its own default already covers.
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else {
        FileHandle.standardError.write("portrait: cannot read \(path), skipping\n".data(using: .utf8)!)
        continue
    }
    let faces = VNDetectFaceRectanglesRequest()
    let attention = VNGenerateAttentionBasedSaliencyImageRequest()
    try? VNImageRequestHandler(cgImage: image, options: [:]).perform([faces, attention])

    let biggest = (faces.results ?? [])
        .max { $0.boundingBox.height < $1.boundingBox.height }
    let salient = (attention.results ?? [])
        .first?.salientObjects?
        .max { $0.boundingBox.height < $1.boundingBox.height }

    out.append(
        Found(
            path: path,
            width: image.width,
            height: image.height,
            face: biggest.map { Box($0.boundingBox) },
            salient: salient.map { Box($0.boundingBox) }))
}

let json = try JSONEncoder().encode(out)
FileHandle.standardOutput.write(json)
