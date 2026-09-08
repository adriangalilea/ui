import { Sample } from "@/app/samples"
import { isMediaAsset, type MediaAsset } from "./media-asset"

// #region asset
const asset: MediaAsset = {
  src: "/glass-river.jpg",
  kind: "image",
  width: 1200,
  height: 900,
  mime: "image/jpeg",
  bytes: 196429,
}
// #endregion
export default function Demo() {
  return (
    <Sample
      name="metadata"
      with="asset"
      label="the contract, independent of storage"
    >
      <pre className="overflow-auto text-xs">
        {JSON.stringify({ valid: isMediaAsset(asset), asset }, null, 2)}
      </pre>
    </Sample>
  )
}
