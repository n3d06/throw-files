import { useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { Modal } from "../../components/modal";
import * as S from "./styles";

const QR_QUIET = 3;
/** How long the tick stays up before the QR dialog drops away. */
const QR_SUCCESS_HOLD_MS = 1500;

/** Renders `value` as an inline SVG QR code (dark modules on a white quiet zone). */
export const QrModal = ({
  visible,
  onClose,
  value,
  joinSignal,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  /** Bumped each time another device joins the channel. */
  joinSignal: number;
}) => {
  // A device joining while the code is on screen almost certainly means it was
  // just scanned: morph the QR into a tick, then let the dialog drop away.
  const [scanned, setScanned] = useState(false);
  const seenSignal = useRef(joinSignal);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) {
      seenSignal.current = joinSignal;
      return;
    }
    if (joinSignal !== seenSignal.current) {
      seenSignal.current = joinSignal;
      setScanned(true);
    }
  }, [visible, joinSignal]);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  useEffect(() => {
    if (!scanned) return;
    const t = setTimeout(() => onCloseRef.current(), QR_SUCCESS_HOLD_MS);
    return () => clearTimeout(t);
  }, [scanned]);

  const { n, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (qr.isDark(r, c)) path += `M${c + QR_QUIET} ${r + QR_QUIET}h1v1h-1z`;
    return { n, path };
  }, [value]);
  const quiet = QR_QUIET;
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={scanned ? "Device connected" : "Scan to open"}
      width={340}
    >
      <S.QrStage $scanned={scanned}>
        <svg
          className="qr"
          viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`}
          role="img"
          aria-label={`QR code for ${value}`}
          shapeRendering="crispEdges"
        >
          <path d={path} fill="#000" />
        </svg>
        {scanned && (
          <S.QrTick role="img" aria-label="Device connected">
            <svg viewBox="0 0 52 52">
              <circle className="disc" cx="26" cy="26" r="25" />
              <path className="mark" d="M14.5 27.5l7.5 7.5 16-16" />
            </svg>
          </S.QrTick>
        )}
      </S.QrStage>
      <S.QrCaption $scanned={scanned}>{value}</S.QrCaption>
    </Modal>
  );
};
