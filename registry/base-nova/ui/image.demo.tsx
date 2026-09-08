import { Sample } from "@/app/samples"
// #region asset
import river from "@/public/glass-river.jpg"
// #endregion
import { Image } from "@/registry/base-nova/ui/image"

export default function Demo() {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Next.js Image optimization works on self-hosted Next servers too. Static
        imports supply the size and blur preview; for remote assets, prepare
        those facts when uploading. Configure remotePatterns or your own loader
        on the host. Static exports need a loader or unoptimized images.
      </p>
      <Sample
        name="responsive"
        with="asset"
        label="reserved space, blur preview, decoded pixels"
      >
        <Image
          src={river}
          alt="A river winding between mountains"
          sizes="(max-width: 768px) 100vw, 800px"
          className="w-full rounded-2xl"
        />
      </Sample>
      <Sample
        name="crop"
        with="asset"
        label="a fixed crop; className styles the frame, imageClassName the pixels"
      >
        <div className="relative aspect-square max-w-sm">
          <Image
            src={river}
            alt="River valley, cropped square"
            fill
            sizes="(max-width: 384px) 100vw, 384px"
            className="rounded-2xl"
            imageClassName="object-cover object-center"
          />
        </div>
      </Sample>
    </div>
  )
}
