"use client";
import {React} from 'react';
export default function ClientBoundary({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
