import { Sample } from "@/app/samples"
// #region asset
import river from "@/public/glass-river.jpg"
// #endregion
import { Image } from "@/registry/base-nova/ui/image"
import { AnimatedImage } from "@/registry/base-nova/ui/image-animation"

export default function Demo() {
  return (
    <div className="space-y-8">
      <Sample
        name="animation"
        label="a native GIF cover, requested on hover/focus; touch uses visibility"
      >
        <AnimatedImage
          src="/preview-animation.gif"
          poster="/video-poster.jpg"
          width={160}
          height={90}
          alt="Animated bunny"
          className="w-80 rounded-xl"
        />
      </Sample>
      <p className="text-sm text-muted-foreground">
        Next.js Image optimization works on self-hosted Next servers too. Static
        imports supply the size and blur preview; for remote assets, prepare
        those facts when uploading. Configure remotePatterns or your own loader
        on the host. Static exports need a loader or unoptimized images.
      </p>
      <Sample
        name="natural"
        with="asset"
        label="intrinsic size, capped by the available width"
      >
        <Image
          src={river}
          width={240}
          height={160}
          alt="Small river illustration"
          sizes="240px"
          className="rounded-xl"
        />
      </Sample>
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
        name="contain"
        with="asset"
        label="contain: placeholder and image share the same fit"
      >
        <div className="relative aspect-square max-w-sm">
          <Image
            src={river}
            alt="Entire river landscape"
            fill
            sizes="384px"
            className="rounded-xl"
            imageClassName="object-contain"
          />
        </div>
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
