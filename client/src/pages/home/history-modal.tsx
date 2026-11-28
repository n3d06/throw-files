import { useState } from "react";
import { ArrowDown, ArrowUp, File as FileIcon, History } from "lucide-react";
import { Modal } from "../../components/modal";
import { Button } from "../../components";
import { formatFileSize, trimFileName } from "../../utils/format";
import * as S from "./styles";

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export interface HistoryEntry {
  id: string;
  name: string;
  size: number;
  at: number;
  channel: string;
  compressed: boolean;
  direction: "send" | "receive";
}

/** "09:41 AM": when a transfer or text happened. */
export function formatTime(at: number): string {
  return TIME_FORMAT.format(new Date(at));
}

export const HistoryModal = ({
  visible,
  onClose,
  history,
  onClearHistory,
}: {
  visible: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onClearHistory: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "send" | "receive">("all");

  const sentCount = history.filter((h) => h.direction === "send").length;
  const receivedCount = history.length - sentCount;
  const files =
    activeTab === "all"
      ? history
      : history.filter((h) => h.direction === activeTab);

  return (
    <Modal
      title={
        <S.ModalTitle>
          <S.HistoryWrapper>
            <History size={16} />
          </S.HistoryWrapper>
          Transfer history
          <S.CountBadge>{history.length}</S.CountBadge>
        </S.ModalTitle>
      }
      visible={visible}
      onClose={onClose}
      width={600}
      footer={
        <S.ModalFooter>
          {history.length > 0 && (
            <Button variant="danger" onClick={onClearHistory}>
              Clear all
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </S.ModalFooter>
      }
    >
      <S.TabBar>
        {(
          [
            { key: "all", label: "All", count: history.length },
            { key: "send", label: "Sent", count: sentCount },
            { key: "receive", label: "Received", count: receivedCount },
          ] as const
        ).map((tab) => (
          <S.TabButton
            key={tab.key}
            $active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <S.TabCount $active={activeTab === tab.key}>{tab.count}</S.TabCount>
          </S.TabButton>
        ))}
      </S.TabBar>

      {files.length === 0 ? (
        <S.EmptyState>
          <S.EmptyIconWrapper>
            <FileIcon size={32} />
          </S.EmptyIconWrapper>
          <S.EmptyTitle>No transfers yet</S.EmptyTitle>
          <S.EmptySubtitle>Your file transfers will appear here</S.EmptySubtitle>
        </S.EmptyState>
      ) : (
        <S.HistoryList>
          {files.map((file) => {
            const type = file.direction === "send" ? "sent" : "received";
            return (
              <S.HistoryItem key={file.id}>
                <S.HistoryItemLeft>
                  <S.StatusBadge $type={type}>
                    {file.direction === "send" ? (
                      <ArrowUp size={11} />
                    ) : (
                      <ArrowDown size={11} />
                    )}
                  </S.StatusBadge>
                  <S.FileNameWrapper>
                    <S.FileNameText title={file.name}>
                      {trimFileName(file.name, 36)}
                    </S.FileNameText>
                    {file.compressed && <S.ZipBadge>ZIP</S.ZipBadge>}
                  </S.FileNameWrapper>
                </S.HistoryItemLeft>
                <S.HistoryItemRight>
                  <S.MetaText>{formatTime(file.at)}</S.MetaText>
                  <S.TypeBadge $type={type}>
                    {file.direction === "send" ? "SENT" : "RECV"}
                  </S.TypeBadge>
                </S.HistoryItemRight>
                <S.FileSizeText>{formatFileSize(file.size)}</S.FileSizeText>
              </S.HistoryItem>
            );
          })}
        </S.HistoryList>
      )}
    </Modal>
  );
};
