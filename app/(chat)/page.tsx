import ClientBoundary from './ClientBoundary';
import ChatClient from './ChatClient';

export default function Page() {
  return (
    <ClientBoundary>
      <ChatClient />
    </ClientBoundary>
  );
}