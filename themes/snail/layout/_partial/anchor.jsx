import React, { useEffect } from 'react';
import useScripts from '../_hooks/useScripts';

export default function Anchor({ config }) {
  useEffect(() => {
    window.async("https://cdn.jsdelivr.net/npm/anchor-js/anchor.min.js", function () {
      window.anchors.options = {
        visible: 'hover',
        placement: 'left',
        icon: 'ℬ'
      };
      window.anchors.add().remove('.intro-header h1').remove('.subheading').remove('.sidebar-container h5');
      resolve();
    });
  }, []);

  useScripts([
    "https://lib.baomitu.com/jquery/3.3.1/jquery.min.js",
    `${config.root}js/anchor.js`,
  ]);

  return (
    <></>
  );
}
