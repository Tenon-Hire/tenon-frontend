import { ResourcePanel } from '../task/components/ResourcePanel';

type Props = {
  showRecording: boolean;
  showDocs: boolean;
  resourceLink: string | null;
};

export function ResourceSections({
  showRecording,
  showDocs,
  resourceLink,
}: Props) {
  return (
    <>
      {showRecording ? (
        <ResourcePanel
          title="Day 4 recording"
          description="Record a short walkthrough covering your decisions."
          linkUrl={resourceLink}
          linkLabel="Open recording link"
          emptyMessage="Look for the recording link in your prompt."
        />
      ) : null}

      {showDocs ? (
        <ResourcePanel
          title="Day 5 documentation"
          description="Capture your final notes and next steps."
          linkUrl={resourceLink}
          linkLabel="Open documentation link"
          emptyMessage="Look for the documentation link in your prompt."
        />
      ) : null}
    </>
  );
}
