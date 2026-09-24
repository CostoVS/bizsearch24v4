import { Metadata } from 'next';
import CategoriesClient from './categories-client';

export const metadata: Metadata = {
  title: 'All Business Categories | South Africa Directory | SearchBiz.co.za',
  description: 'Explore all 18+ business industries and 150+ specialized categories across South Africa. Find verified plumbers, mechanics, lawyers, medical practitioners, accountants, builders, and local professionals.',
  keywords: 'South Africa business categories, directory categories, tradesmen, professional services, find local business SA',
  openGraph: {
    title: 'All Business Categories | SearchBiz.co.za',
    description: 'Explore verified South African businesses across all industries and specializations.',
    url: 'https://searchbiz.co.za/categories',
    siteName: 'SearchBiz.co.za',
    type: 'website',
  },
};

export default function CategoriesPage() {
  return <CategoriesClient />;
}
