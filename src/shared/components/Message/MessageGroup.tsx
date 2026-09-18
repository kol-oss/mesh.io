type MessageGroupProps = {
  children?: React.ReactNode;
};

export default function MessageGroup({ children }: MessageGroupProps) {
  return (
    <div className="simulation-panel__packet-structure" aria-label={"Message Structure"}>
      {children}
    </div>
  );
}
