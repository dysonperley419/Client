import { useCallback, useRef, useState } from 'react';

import { useGateway } from '@/context/gatewayContext';
import type { Channel } from '@/types/channel';

export const useVoice = () => {
  const { sendOp, user } = useGateway();
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeGuildId, setActiveGuildId] = useState<string | null>(null);

  const voiceSocket = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<{ sessionId?: string; token?: string; endpoint?: string }>({});
  const webrtcP2P =
    JSON.parse(localStorage.getItem('developerSettings') ?? '{}').webrtc_p2p ?? false;

  const tryConnectVoiceSocket = useCallback(async () => {
    const { sessionId, token, endpoint } = sessionRef.current;
    if (!sessionId || !token || !endpoint) return;

    const url = `ws://${endpoint}/?v=3`;
    const vs = new WebSocket(url);

    voiceSocket.current = vs;

    vs.onopen = () => {
      vs.send(
        JSON.stringify({
          op: 0,
          d: {
            server_id: activeGuildId,
            user_id: user?.id,
            session_id: sessionId,
            token: token,
            video: false,
          },
        }),
      );
    };

    vs.onmessage = async (e) => {
      const { op, d } = JSON.parse(e.data);

      if (op === 2) {
        await handleVoiceReady(vs, d);
      }
      if (op === 4) {
        await pcRef.current?.setRemoteDescription(
          new RTCSessionDescription({
            type: 'answer',
            sdp: d.sdp,
          }),
        );
        setConnectionStatus('connected');
      }
    };
  }, [activeGuildId, user?.id]);

  const handleVoiceReady = async (vs: WebSocket, data: unknown) => {
    //data has: ssrc, ip, port, modes, heartbeat_interval

    const pc = new RTCPeerConnection();

    pcRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    localStreamRef.current = stream;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event: any) => {
      setRemoteStreams((prev) => new Map(prev).set(event.streams[0].id, event.streams[0]));
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    vs.send(
      JSON.stringify({
        op: 1,
        d: {
          protocol: 'webrtc',
          data: offer.sdp,
          sdp: offer.sdp,
          codecs: [
            {
              name: 'opus',
              type: 'audio',
              priority: 1000,
              payload_type: 109,
            },
          ],
        },
      }),
    );
  };

  const connectToVoice = useCallback(
    (guildId: string | null, channel: Channel) => {
      if (activeChannel?.id === channel.id) return;

      setConnectionStatus('connecting');
      setActiveChannel(channel);
      setActiveGuildId(guildId);

      const onVoiceState = (e: any) => {
        if (e.detail.user_id === user?.id) {
          sessionRef.current.sessionId = e.detail.session_id;
          tryConnectVoiceSocket();
        }
      };
      const onVoiceServer = (e: any) => {
        sessionRef.current.token = e.detail.token;
        sessionRef.current.endpoint = e.detail.endpoint;
        tryConnectVoiceSocket();
      };

      window.addEventListener('gateway_voice_state', onVoiceState);
      window.addEventListener('gateway_voice_server', onVoiceServer);

      sendOp!(4, {
        guild_id: guildId,
        channel_id: channel.id,
        self_mute: false,
        self_deaf: false,
      });
    },
    [activeChannel, sendOp, user?.id, tryConnectVoiceSocket],
  );

  const disconnect = useCallback(() => {
    voiceSocket.current?.close();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });

    setConnectionStatus('disconnected');
    setActiveChannel(null);
    setRemoteStreams(new Map());
  }, []);

  return { connectToVoice, disconnect, connectionStatus, remoteStreams, channel: activeChannel };
};
