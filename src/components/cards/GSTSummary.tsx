import { formatINR } from '../../utils/formatters'

interface GSTData {
  outputGST: number
  inputGST: number
  netLiability: number
}

interface Props {
  gst: GSTData
}

export default function GSTSummary({ gst }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">GST Summary</h2>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Output GST (collected)</span>
        <span className="text-gray-800">{formatINR(gst.outputGST)}</span>
      </div>
      <hr className="my-3 border-gray-100" />
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Input GST (paid)</span>
        <span className="text-gray-800">{formatINR(gst.inputGST)}</span>
      </div>
      <hr className="my-3 border-gray-100" />
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Net Liability</span>
        <span className="font-bold text-brand">{formatINR(gst.netLiability)}</span>
      </div>
    </div>
  )
}
