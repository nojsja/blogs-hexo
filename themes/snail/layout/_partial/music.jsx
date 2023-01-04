import React, { useCallback, useEffect } from 'react';

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
  const apcallback = useCallback(function (apobserver) {
    var musicPlayer = document.querySelector('#aplayer');
    if (apobserver) apobserver.disconnect();
    musicPlayer.className = "";
    musicPlayer.innerHTML = "";

    new APlayer({
      container: document.getElementById('aplayer'),
      theme: '#e9e9e9',
      audio: audios,
    });
  }, []);

  /* get player resources */
  const apinit = useCallback(function (sources, apobserver) {
    sources.forEach(function (source) {
      if (!source) return;
      async(source, function () {
        if (/^.*.js$/.test(source)) {
          apcallback(apobserver);
        }
      }, /^.*.css$/.test(source) ? 'link' : 'script');
    });
  }, []);

  useEffect(() => {
    const musicPlayer = document.querySelector('#aplayer');
    let apobserver;

    /* scroll listener */
    if (window.IntersectionObserver) {
      apobserver = new IntersectionObserver(function (entrys) {
        entrys.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          apobserver.unobserve(entry.target);

          const cssHref = entry.target.getAttribute('lazy-css-href');
          const jsSrc = entry.target.getAttribute('lazy-js-src');
          apinit([cssHref, jsSrc], apobserver);

        });
      });

      apobserver.observe(musicPlayer);
    } else {
      const cssHref = musicPlayer.getAttribute('lazy-css-href');
      const jsSrc = musicPlayer.getAttribute('lazy-js-src');

      apinit([cssHref, jsSrc, apobserver]);
    }

    return () => {
      apobserver && apobserver.disconnect();
    };

  }, []);

  return (
    <div class="aplayer-container">
      <div id="aplayer"
        class="lds-roller-loading"
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