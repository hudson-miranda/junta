import { Redirect, useLocalSearchParams } from 'expo-router';
export default function PublicLink() {
  const { slug, ref } = useLocalSearchParams<{ slug: string; ref?: string }>();
  return (
    <Redirect href={{ pathname: '/product/[slug]', params: { slug, ...(ref ? { ref } : {}) } }} />
  );
}
