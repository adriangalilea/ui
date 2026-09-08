import { Sample } from "@/app/samples"
import { Video } from "./video"

export default function Demo() {
  return (
    <div className="space-y-8">
      <Sample
        name="preview"
        label="hover or focus; on touch, visible previews play; you can always pause"
      >
        <Video
          src="/bunny.mp4"
          poster="/video-poster.jpg"
          width={1280}
          height={720}
          mode="preview"
          label="bunny preview"
          className="w-full rounded-xl"
        />
      </Sample>
      <Sample
        name="player"
        label="native controls, sound and captions remain native"
      >
        <Video
          src="/bunny.mp4"
          poster="/video-poster.jpg"
          width={1280}
          height={720}
          label="bunny film"
          className="w-full rounded-xl"
        />
      </Sample>
    </div>
  )
}
