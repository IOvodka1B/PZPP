import PageBuilderEditorClient from "./pageBuilderEditorClient";

export default async function PageBuilderEditorPage({ params }) {
  const { id } = await params;
  return <PageBuilderEditorClient landingId={id} />;
}

