import { readFile } from "node:fs/promises"
import { Sample } from "@/app/samples"
import { Image } from "@/registry/base-nova/ui/image"
import { mediaAsset, prepareMedia } from "./prepare-media"

// #region prepare
async function example() {
  const prepared = await prepareMedia(await readFile("public/glass-river.jpg"))
  // A real uploader writes prepared.files to its own storage before publishing this metadata.
  // This example uses data URLs so its prepared output requires no upload service.
  return mediaAsset(prepared, (name) => {
    const file = prepared.files.find((f) => f.name === name)
    if (!file) throw new Error("Missing prepared file")
    return `data:${file.mime};base64,${file.data.toString("base64")}`
  })
}
// #endregion
export default async function Demo() {
  const asset = await example()
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Run preparation in Node at upload time or in a CLI. It returns files and
        metadata; your application chooses storage and publishes only after the
        files are written. Video requires FFmpeg and ffprobe on PATH and an
        explicit video option. Run heavy video work in a worker, not an edge
        request.
      </p>
      <p className="font-mono text-xs">
        pnpm exec tsx lib/prepare-media-cli.ts input.jpg public/media /media
      </p>
      <p className="text-sm text-muted-foreground">
        For a deliberate boomerang, add --boomerang to a GIF or video input.
        Preparation renders a silent forward/reverse MP4, ready for Video with
        loop enabled. Clips must be 0.1–10 seconds. Without this option, GIF
        bytes and animation stay intact.
      </p>
      <Sample
        name="prepared"
        with="prepare"
        label="the output of real preparation"
      >
        <Image
          src={asset.src}
          width={asset.width}
          height={asset.height}
          blurDataURL={asset.blurDataURL}
          alt="Prepared river landscape"
          className="w-full rounded-xl"
          unoptimized
        />
      </Sample>
    </div>
  )
}
