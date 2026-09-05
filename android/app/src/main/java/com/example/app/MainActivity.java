package com.example.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private static final String CHANNEL_ID = "popokoolkool-playback";
	private static final int NOTIFICATION_ID = 24;
	private static final int NOTIFICATION_PERMISSION_REQUEST = 401;

	private MediaSession mediaSession;
	private NotificationManager notificationManager;
	private boolean playing;

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		notificationManager = getSystemService(NotificationManager.class);
		createNotificationChannel();

		mediaSession = new MediaSession(this, "PopoKoolKool");
		mediaSession.setCallback(new MediaSession.Callback() {
			@Override
			public void onPlay() {
				dispatchMediaEvent("native-media-play");
			}

			@Override
			public void onPause() {
				dispatchMediaEvent("native-media-pause");
			}

			@Override
			public void onStop() {
				dispatchMediaEvent("native-media-pause");
			}
		});
		mediaSession.setFlags(
				MediaSession.FLAG_HANDLES_MEDIA_BUTTONS
						| MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
		mediaSession.setMetadata(new android.media.MediaMetadata.Builder()
				.putString(android.media.MediaMetadata.METADATA_KEY_TITLE, "Rainy window ritual")
				.putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, "포포쿨쿨")
				.putString(android.media.MediaMetadata.METADATA_KEY_ALBUM, "Sleep sounds")
				.build());
		mediaSession.setActive(true);

		getBridge().getWebView().addJavascriptInterface(
				new AndroidMediaSessionBridge(), "AndroidMediaSession");
	}

	private void createNotificationChannel() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			NotificationChannel channel = new NotificationChannel(
					CHANNEL_ID, "포포쿨쿨 재생", NotificationManager.IMPORTANCE_LOW);
			channel.setDescription("수면 사운드 재생 상태");
			notificationManager.createNotificationChannel(channel);
		}
	}

	private void dispatchMediaEvent(String eventName) {
		runOnUiThread(() -> getBridge().getWebView().evaluateJavascript(
				"window.dispatchEvent(new Event('" + eventName + "'))", null));
	}

	private void updatePlaybackState(boolean playing) {
		this.playing = playing;
		long actions = PlaybackState.ACTION_PLAY
				| PlaybackState.ACTION_PAUSE
				| PlaybackState.ACTION_PLAY_PAUSE
				| PlaybackState.ACTION_STOP;
		int state = playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
		PlaybackState playbackState = new PlaybackState.Builder()
				.setActions(actions)
				.setState(state, PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1.0f)
				.build();
		mediaSession.setPlaybackState(playbackState);
		showPlaybackNotification(playing);
	}

	private void showPlaybackNotification(boolean playing) {
		if (!playing) {
			notificationManager.cancel(NOTIFICATION_ID);
			return;
		}

		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
				&& checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
						!= PackageManager.PERMISSION_GRANTED) {
			requestPermissions(
					new String[] {Manifest.permission.POST_NOTIFICATIONS},
					NOTIFICATION_PERMISSION_REQUEST);
			return;
		}

		Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
				? new Notification.Builder(this, CHANNEL_ID)
				: new Notification.Builder(this);
		builder.setContentTitle("Rainy window ritual")
				.setContentText(playing ? "포포쿨쿨 재생 중" : "포포쿨쿨 일시정지")
				.setSmallIcon(android.R.drawable.ic_media_play)
				.setOngoing(playing)
				.setStyle(new Notification.MediaStyle()
						.setMediaSession(mediaSession.getSessionToken())
						.setShowActionsInCompactView(0, 1))
				.addAction(new Notification.Action.Builder(
						android.R.drawable.ic_media_pause, "일시정지", null).build())
				.addAction(new Notification.Action.Builder(
						android.R.drawable.ic_media_play, "재생", null).build());

		notificationManager.notify(NOTIFICATION_ID, builder.build());
	}

	@Override
	public void onRequestPermissionsResult(
			int requestCode, String[] permissions, int[] grantResults) {
		super.onRequestPermissionsResult(requestCode, permissions, grantResults);
		if (requestCode == NOTIFICATION_PERMISSION_REQUEST
				&& Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
				&& grantResults.length > 0
				&& grantResults[0] == PackageManager.PERMISSION_GRANTED
				&& playing) {
			showPlaybackNotification(true);
		}
	}

	private class AndroidMediaSessionBridge {
		@JavascriptInterface
		public void setPlaying(boolean playing) {
			runOnUiThread(() -> updatePlaybackState(playing));
		}
	}

	@Override
	public void onDestroy() {
		if (mediaSession != null) {
			mediaSession.release();
		}
		if (notificationManager != null) {
			notificationManager.cancel(NOTIFICATION_ID);
		}
		super.onDestroy();
	}
}
