import React from 'react';
import { CollectionExplorerSkeleton } from '@/components/catalog/CollectionExplorer';

export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Breadcrumb Skeleton */}
      <div className="h-3 w-40 bg-[#EAE5DC] rounded-xs animate-pulse" />

      {/* Header Skeleton */}
      <div className="border-b border-[#EAE5DC] pb-6 space-y-2">
        <div className="h-3 w-32 bg-[#E2DED6] rounded-xs animate-pulse" />
        <div className="h-9 w-64 bg-[#DDD8CF] rounded-xs animate-pulse" />
      </div>

      {/* Filter Bar & Cards Skeleton */}
      <CollectionExplorerSkeleton count={9} viewMode="grid" />
    </div>
  );
}
