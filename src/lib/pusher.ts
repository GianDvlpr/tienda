import Pusher from 'pusher';

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const trackerPusherServer = new Pusher({
    appId: process.env.TRACKER_PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_TRACKER_PUSHER_KEY!,
    secret: process.env.TRACKER_PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_TRACKER_PUSHER_CLUSTER!,
    useTLS: true,
});
