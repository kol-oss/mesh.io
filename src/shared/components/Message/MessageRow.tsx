type MessageRowProps = {
  children?: React.ReactNode;
};

export default function MessageRow({ children }: MessageRowProps) {
  return (
    <>
      <div className="simulation-panel__packet-row">{children}</div>
    </>
  );
}
