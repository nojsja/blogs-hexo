import React, { useEffect } from 'react';

export default function useScripts(scripts, isAsync = false) {
  const appendScript = (url) => {
    if (document.querySelector(`#${url}`)) return;
    const script = document.createElement('script');
    script.src = url;
    script.id = url;
    script.async = isAsync;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  };

  useEffect(() => {
    const removeScripts = scripts.map(appendScript);

    return () => {
      removeScripts.forEach((removeScript) => removeScript());
    };
  }, []);
}
