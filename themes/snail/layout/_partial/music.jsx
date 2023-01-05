import React, { useCallback } from 'react';
import useIntersectionObserver from '../_hooks/useIntersectionObserver';

const audios = [
  {
    name: '存在信号',
    artist: 'AcuticNotes',
    url: 'http://nojsja.gitee.io/static-resources/audio/life-signal.mp3',
    cover: 'http://nojsja.gitee.io/static-resources/audio/life-signal.jpg'

  }, {
    name: '遺サレタ場所／斜光',
    artist: '岡部啓一',
    url: 'http://nojsja.gitee.io/static-resources/audio/%E6%96%9C%E5%85%89.mp3',
    cover: 'http://nojsja.gitee.io/static-resources/audio/%E6%96%9C%E5%85%89.jpg'
  }
];

export default function Music() {

  /* load player */
  const initPlayer = useCallback(function () {
    var musicPlayer = document.querySelector('#aplayer');
    musicPlayer.className = "";
    musicPlayer.innerHTML = "";

    new APlayer({
      container: document.getElementById('aplayer'),
      theme: '#e9e9e9',
      audio: audios,
    });
  }, []);

  /* get player resources */
  const apinit = useCallback(function (sources) {
    sources.forEach(function (source) {
      if (!source) return;
      async(source, function () {
        if (/^.*.js$/.test(source)) {
          initPlayer();
        }
      }, /^.*.css$/.test(source) ? 'link' : 'script');
    });
  }, []);

  useIntersectionObserver(() => {
    const musicPlayer = document.querySelector('#aplayer');
    if (!musicPlayer) return;
    const cssHref = musicPlayer.getAttribute('lazy-css-href');
    const jsSrc = musicPlayer.getAttribute('lazy-js-src');

    apinit([cssHref, jsSrc]);
  }, '#aplayer');

  return (
    <div className="aplayer-container">
      <div id="aplayer"
        className="lds-roller-loading"
        lazy-css-href="https://unpkg.com/aplayer@1.10.1/dist/APlayer.min.css"
        lazy-js-src="https://unpkg.com/aplayer@1.10.1/dist/APlayer.min.js"
      >
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
};