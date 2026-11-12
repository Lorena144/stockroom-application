export default function NotFound() {
  return (
    <main className="empty-state standalone">
      <p className="eyebrow">PAGE NOT FOUND</p>
      <h1>Nothing on this shelf.</h1>
      <p>The page or product you’re looking for could not be found.</p>
      <a className="button primary" href="/catalog">
        Back to catalog
      </a>
    </main>
  );
}
