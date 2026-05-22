// 播放列表（使用本地音乐文件）
const musicList = [
  {
    title: "Call You Tonight",
    author: "Whitney Houston",
    src: "mp3/Whitney Houston - Call You Tonight.mp3",
    cover: "img/record0.jpg",
    lrc: "lrc/Call You Tonight-Whitney Houston-歌词.lrc"
  },
  {
    title: "我怀念的",
    author: "孙燕姿",
    src: "mp3/孙燕姿 - 我怀念的.mp3",
    cover: "img/record1.jpg",
    lrc: "lrc/我怀念的-孙燕姿-歌词.lrc"
  },
  {
    title: "爱情讯息",
    author: "郭静",
    src: "mp3/爱情讯息 - 郭静.mp3",
    cover: "img/record2.jpg",
    lrc: "lrc/爱情讯息-郭静-歌词 .lrc"
  },
  {
    title: "阴天",
    author: "莫文蔚",
    src: "mp3/阴天-莫文蔚.mp3",
    cover: "img/record3.jpg",
    lrc: "lrc/阴天-莫文蔚-歌词.lrc"
  }
];

// DOM元素
const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const shuffleBtn = document.getElementById("shuffle");
const volumeBtn = document.getElementById("volume");
const volumeBar = document.getElementById("volume-bar");
const volumeFill = document.getElementById("volume-fill");
const volumeThumb = document.getElementById("volume-thumb");
const titleEl = document.getElementById("music-title");
const authorEl = document.getElementById("music-author");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");
const progressThumb = document.getElementById("progress-thumb");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const playlistContent = document.getElementById("playlist-content");
const playlistCount = document.getElementById("playlist-count");
const vinylRecord = document.getElementById("vinyl-record");
const vinylCover = document.getElementById("vinyl-cover");
const lyricsContainer = document.getElementById("lyrics-container");
const lyricsSection = document.getElementById("lyrics-section");
const playlistSection = document.getElementById("playlist-section");
const playlistToggle = document.getElementById("playlist-toggle");
const panelClose = document.getElementById("panel-close");

// 歌词数据
let lyrics = [];
let currentLyricIndex = -1;

// 播放器状态
let index = 0;
let repeatMode = 0; // 0: 顺序播放, 1: 单曲循环, 2: 随机播放
let isMuted = false; // 是否静音
let previousVolume = 0.7; // 静音前的音量
let isDraggingVolume = false;
let isPlaying = false;
let isDraggingProgress = false;

// 解析LRC歌词
function parseLRC(lrcText) {
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/g;
  
  lines.forEach(line => {
    let match;
    const times = [];
    
    // 提取所有时间标签
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3]);
      times.push(minutes * 60 + seconds + milliseconds / 100);
    }
    
    // 提取歌词内容
    const text = line.replace(/\[(\d{2}):(\d{2})\.(\d{2})\]/g, '').trim();
    
    if (times.length > 0 && text) {
      times.forEach(time => {
        result.push({ time, text });
      });
    }
  });
  
  // 按时间排序
  result.sort((a, b) => a.time - b.time);
  return result;
}

// 加载歌词文件
function loadLyrics(lrcPath) {
  fetch(lrcPath)
    .then(response => {
      if (!response.ok) {
        throw new Error('歌词文件加载失败');
      }
      return response.text();
    })
    .then(text => {
      lyrics = parseLRC(text);
      renderLyrics();
    })
    .catch(() => {
      lyrics = [];
      lyricsContainer.innerHTML = '<div class="lyric-line active">♪ 暂无歌词 ♪</div>';
    });
}

// 渲染歌词
function renderLyrics() {
  if (lyrics.length === 0) {
    lyricsContainer.innerHTML = '<div class="lyric-line active">♪ 暂无歌词 ♪</div>';
    return;
  }
  
  lyricsContainer.innerHTML = lyrics.map((lyric, i) => {
    return `<div class="lyric-line${i === currentLyricIndex ? ' active' : ''}" data-index="${i}" data-time="${lyric.time}">${lyric.text}</div>`;
  }).join('');
  
  // 添加点击事件
  const lyricLines = lyricsContainer.querySelectorAll('.lyric-line');
  lyricLines.forEach((line) => {
    line.addEventListener('click', () => {
      const time = parseFloat(line.dataset.time);
      if (!isNaN(time)) {
        audio.currentTime = time;
        // 如果未播放则播放
        if (audio.paused) {
          play();
        }
      }
    });
  });
}

// 更新当前歌词
function updateLyric(currentTime) {
  if (lyrics.length === 0) return;
  
  let newIndex = -1;
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) {
      newIndex = i;
      break;
    }
  }
  
  if (newIndex !== currentLyricIndex && newIndex >= 0) {
    currentLyricIndex = newIndex;
    
    // 更新歌词高亮
    const lyricLines = lyricsContainer.querySelectorAll('.lyric-line');
    lyricLines.forEach((line, i) => {
      line.classList.toggle('active', i === currentLyricIndex);
    });
  }
  
  // 确保当前歌词始终在容器正中间
  centerActiveLyric();
}

// 将高亮歌词居中显示
function centerActiveLyric() {
  const activeLine = lyricsContainer.querySelector('.lyric-line.active');
  if (activeLine) {
    const containerHeight = lyricsContainer.offsetHeight;
    const lineHeight = activeLine.offsetHeight;
    const lineTop = activeLine.offsetTop;
    const desiredScrollTop = lineTop - containerHeight / 2 + lineHeight / 2;
    
    // 直接设置滚动位置，确保高亮歌词在正中间
    lyricsContainer.scrollTop = Math.max(0, desiredScrollTop);
  }
}

// 加载歌曲
function loadMusic(i) {
  index = i;
  const music = musicList[index];
  audio.src = music.src;
  titleEl.textContent = music.title;
  authorEl.textContent = music.author;
  
  // 更新封面
  vinylCover.src = music.cover;
  
  // 加载歌词
  currentLyricIndex = -1;
  if (music.lrc) {
    loadLyrics(music.lrc);
  } else {
    lyrics = [];
    lyricsContainer.innerHTML = '<div class="lyric-line active">♪ 暂无歌词 ♪</div>';
  }
  
  // 渲染播放列表
  renderPlaylist();
  
  // 重置进度
  progressFill.style.width = '0%';
  progressThumb.style.left = '0%';
  currentTimeEl.textContent = '00:00';
}

// 获取下一个随机索引
function getRandomIndex() {
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * musicList.length);
  } while (randomIndex === index && musicList.length > 1);
  return randomIndex;
}

// 渲染播放列表
function renderPlaylist() {
  playlistContent.innerHTML = '';
  playlistCount.textContent = musicList.length;
  
  musicList.forEach((item, i) => {
    const itemEl = document.createElement('div');
    itemEl.className = `playlist-item${i === index ? ' active' : ''}`;
    itemEl.innerHTML = `
      <div class="playlist-item-index">${i + 1}</div>
      <div class="playlist-item-info">
        <div class="playlist-item-title">${item.title}</div>
        <div class="playlist-item-author">${item.author}</div>
      </div>
      <div class="playlist-item-duration" id="duration-${i}">--:--</div>
    `;
    itemEl.addEventListener('click', () => {
      loadMusic(i);
      play();
    });
    playlistContent.appendChild(itemEl);
    
    // 预加载获取时长
    const tempAudio = new Audio(item.src);
    tempAudio.addEventListener('loadedmetadata', () => {
      const durationEl = document.getElementById(`duration-${i}`);
      if (durationEl) {
        durationEl.textContent = formatTime(tempAudio.duration);
      }
    });
  });
}

// 时间格式化
function formatTime(t) {
  if (isNaN(t) || !isFinite(t)) return '--:--';
  const m = String(Math.floor(t / 60)).padStart(2, '0');
  const s = String(Math.floor(t % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

// 播放
function play() {
  // 确保音频已加载
  if (audio.readyState < 4) {
    audio.addEventListener('canplaythrough', () => {
      audio.play();
    }, { once: true });
  } else {
    audio.play();
  }
  isPlaying = true;
  playBtn.innerHTML = '<img src="img/暂停.png" alt="暂停">';
  vinylRecord.classList.add('spinning');
}

// 暂停
function pause() {
  audio.pause();
  isPlaying = false;
  playBtn.innerHTML = '<img src="img/继续播放.png" alt="播放">';
  vinylRecord.classList.remove('spinning');
}

// 播放/暂停按钮
playBtn.addEventListener('click', () => {
  if (audio.paused || !isPlaying) {
    play();
  } else {
    pause();
  }
});

// 上一曲
prevBtn.addEventListener('click', () => {
  if (repeatMode === 2) {
    // 随机播放
    index = getRandomIndex();
  } else {
    // 顺序播放或单曲循环
    index = (index - 1 + musicList.length) % musicList.length;
  }
  loadMusic(index);
  play();
});

// 下一曲
nextBtn.addEventListener('click', () => {
  if (repeatMode === 2) {
    // 随机播放
    index = getRandomIndex();
  } else {
    // 顺序播放或单曲循环
    index = (index + 1) % musicList.length;
  }
  loadMusic(index);
  play();
});

// 播放模式切换（单曲循环、顺序循环、随机播放）
shuffleBtn.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  
  // 更新按钮图片和提示
  switch (repeatMode) {
    case 0:
      // 顺序播放
      shuffleBtn.innerHTML = '<img src="img/mode2.png" alt="顺序播放">';
      shuffleBtn.title = '顺序播放';
      shuffleBtn.classList.remove('active');
      break;
    case 1:
      // 单曲循环
      shuffleBtn.innerHTML = '<img src="img/mode1.png" alt="单曲循环">';
      shuffleBtn.title = '单曲循环';
      shuffleBtn.classList.add('active');
      break;
    case 2:
      // 随机播放
      shuffleBtn.innerHTML = '<img src="img/mode3.png" alt="随机播放">';
      shuffleBtn.title = '随机播放';
      shuffleBtn.classList.add('active');
      break;
  }
});

// 更新音量条显示
function updateVolumeDisplay() {
  const percent = audio.volume * 100;
  volumeFill.style.width = `${percent}%`;
  volumeThumb.style.left = `${percent}%`;
}

// 音量按钮单击静音/取消静音
volumeBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  
  if (isMuted) {
    // 静音
    previousVolume = audio.volume;
    audio.volume = 0;
    volumeBtn.innerHTML = '<img src="img/静音.png" alt="静音">';
    volumeBtn.title = '已静音（单击恢复）';
    volumeBtn.classList.add('active');
  } else {
    // 恢复音量
    audio.volume = previousVolume;
    volumeBtn.innerHTML = '<img src="img/音量.png" alt="音量">';
    volumeBtn.title = '点击静音/取消静音';
    volumeBtn.classList.remove('active');
  }
  updateVolumeDisplay();
});

// 音量条点击
volumeBar.addEventListener('click', (e) => {
  const rect = volumeBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.volume = Math.max(0, Math.min(1, percent));
  isMuted = audio.volume === 0;
  updateVolumeDisplay();
  updateVolumeButton();
});

// 更新音量按钮状态
function updateVolumeButton() {
  if (audio.volume === 0) {
    volumeBtn.innerHTML = '<img src="img/静音.png" alt="静音">';
    volumeBtn.title = '已静音（单击恢复）';
    volumeBtn.classList.add('active');
  } else {
    volumeBtn.innerHTML = '<img src="img/音量.png" alt="音量">';
    volumeBtn.title = '点击静音/取消静音';
    volumeBtn.classList.remove('active');
  }
}

// 音量条拖拽 - 开始
volumeBar.addEventListener('mousedown', (e) => {
  isDraggingVolume = true;
  volumeThumb.classList.add('active');
  updateVolumePosition(e.clientX);
});

volumeThumb.addEventListener('mousedown', (e) => {
  e.stopPropagation();
  isDraggingVolume = true;
  volumeThumb.classList.add('active');
});

// 更新音量位置
function updateVolumePosition(clientX) {
  const rect = volumeBar.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  audio.volume = percent;
  isMuted = audio.volume === 0;
  updateVolumeDisplay();
  updateVolumeButton();
}

// 音量条拖拽 - 移动
document.addEventListener('mousemove', (e) => {
  if (isDraggingVolume) {
    updateVolumePosition(e.clientX);
  }
});

document.addEventListener('mouseup', () => {
  if (isDraggingVolume) {
    isDraggingVolume = false;
    volumeThumb.classList.remove('active');
  }
});

// 更新进度条显示
function updateProgressDisplay(currentTime, duration) {
  const percent = duration > 0 ? currentTime / duration : 0;
  progressFill.style.width = `${percent * 100}%`;
  progressThumb.style.left = `${percent * 100}%`;
  currentTimeEl.textContent = formatTime(currentTime);
}

// 进度条点击
progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
});

// 记录拖动前的播放状态
let wasPlayingBeforeDrag = false;

// 进度条拖拽 - 开始
progressBar.addEventListener('mousedown', (e) => {
  isDraggingProgress = true;
  progressThumb.classList.add('active');
  // 记录播放状态并暂停
  wasPlayingBeforeDrag = !audio.paused;
  if (wasPlayingBeforeDrag) {
    audio.pause();
  }
  updateProgressPosition(e.clientX);
});

progressThumb.addEventListener('mousedown', (e) => {
  e.stopPropagation();
  isDraggingProgress = true;
  progressThumb.classList.add('active');
  wasPlayingBeforeDrag = !audio.paused;
  if (wasPlayingBeforeDrag) {
    audio.pause();
  }
});

// 更新进度位置
function updateProgressPosition(clientX) {
  if (!audio.duration) return;
  const rect = progressBar.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  audio.currentTime = percent * audio.duration;
  updateProgressDisplay(audio.currentTime, audio.duration);
}

// 进度条拖拽 - 移动
document.addEventListener('mousemove', (e) => {
  if (isDraggingProgress) {
    updateProgressPosition(e.clientX);
  }
});

document.addEventListener('mouseup', () => {
  isDraggingProgress = false;
  progressThumb.classList.remove('active');
  // 恢复播放状态
  if (wasPlayingBeforeDrag) {
    audio.play();
  }
});

// 触摸设备支持
progressBar.addEventListener('touchstart', (e) => {
  isDraggingProgress = true;
  progressThumb.classList.add('active');
  wasPlayingBeforeDrag = !audio.paused;
  if (wasPlayingBeforeDrag) {
    audio.pause();
  }
  const touch = e.touches[0];
  updateProgressPosition(touch.clientX);
});

document.addEventListener('touchmove', (e) => {
  if (isDraggingProgress) {
    const touch = e.touches[0];
    updateProgressPosition(touch.clientX);
  }
});

document.addEventListener('touchend', () => {
  isDraggingProgress = false;
  progressThumb.classList.remove('active');
  if (wasPlayingBeforeDrag) {
    audio.play();
  }
});

// 初始化音量
audio.volume = 0.7;

// 进度条更新
audio.addEventListener('timeupdate', () => {
  if (isDraggingProgress) return;
  updateProgressDisplay(audio.currentTime, audio.duration);
  updateLyric(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
});

// 自动下一曲
audio.addEventListener('ended', () => {
  if (repeatMode === 1) {
    // 单曲循环
    audio.currentTime = 0;
    play();
  } else {
    nextBtn.click();
  }
});

// 音频加载错误处理
audio.addEventListener('error', () => {
  console.error('音频加载失败');
});

// 键盘控制
document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      if (isPlaying) pause();
      else play();
      break;
    case 'ArrowLeft':
      audio.currentTime = Math.max(0, audio.currentTime - 5);
      break;
    case 'ArrowRight':
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      break;
    case 'ArrowUp':
      audio.volume = Math.min(1, audio.volume + 0.1);
      break;
    case 'ArrowDown':
      audio.volume = Math.max(0, audio.volume - 0.1);
      break;
  }
});

// 播放列表切换
playlistToggle.addEventListener('click', () => {
  const isPlaylistVisible = playlistSection.classList.contains('show');
  
  if (isPlaylistVisible) {
    // 切换到歌词显示
    playlistSection.classList.remove('show');
    lyricsSection.classList.remove('hide');
  } else {
    // 切换到播放列表
    playlistSection.classList.add('show');
    lyricsSection.classList.add('hide');
  }
});

// 关闭面板（切换回歌词）
panelClose.addEventListener('click', () => {
  playlistSection.classList.remove('show');
  lyricsSection.classList.remove('hide');
});

// 初始化
loadMusic(0);
renderPlaylist();

// 初始化播放模式为顺序循环
shuffleBtn.innerHTML = '<img src="img/mode2.png" alt="顺序播放">';
shuffleBtn.title = '顺序播放';
updateVolumeDisplay();