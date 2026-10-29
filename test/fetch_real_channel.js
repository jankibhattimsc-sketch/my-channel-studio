require('dotenv').config();
const googleService = require('../server/services/googleService');
const { google } = require('googleapis');
const db = require('../server/db');

async function testFetch() {
  const authClient = await googleService.getAuthenticatedClient();
  if (!authClient) {
    console.log('No auth client');
    return;
  }
  const youtube = google.youtube({ version: 'v3', auth: authClient });
  const authState = db.getAuth();
  const activeId = authState.activeChannelId;
  const channelObj = authState.channels.find(c => c.id === activeId);
  console.log('Active channel:', channelObj.title, 'Uploads playlist:', channelObj.uploadsPlaylistId);

  const playlistRes = await youtube.playlistItems.list({
    part: ['snippet', 'contentDetails'],
    playlistId: channelObj.uploadsPlaylistId,
    maxResults: 20
  });

  const videoIds = (playlistRes.data.items || []).map(item => item.contentDetails.videoId);
  console.log('Found video IDs:', videoIds.length);

  const videosRes = await youtube.videos.list({
    part: ['snippet', 'statistics', 'contentDetails'],
    id: videoIds
  });

  const videos = (videosRes.data.items || []).map(v => ({
    id: v.id,
    title: v.snippet.title,
    views: parseInt(v.statistics.viewCount || '0', 10),
    likes: parseInt(v.statistics.likeCount || '0', 10),
    comments: parseInt(v.statistics.commentCount || '0', 10),
    publishedAt: v.snippet.publishedAt
  }));

  console.log('Top videos by views:');
  const sorted = [...videos].sort((a,b) => b.views - a.views);
  sorted.slice(0, 10).forEach((v, idx) => {
    console.log(`${idx + 1}. [${v.views} views] ${v.title} (${v.publishedAt})`);
  });
}

testFetch().catch(console.error);
