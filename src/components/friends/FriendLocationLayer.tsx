interface FriendLocationLayerProps {
  visible: boolean;
  map: google.maps.Map | null;
}

export default function FriendLocationLayer({ visible, map }: FriendLocationLayerProps) {
  // TODO: Implement friend location markers using Google Maps Marker API
  if (!visible) return null;
  return null;
}
