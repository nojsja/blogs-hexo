const fs = require('fs');
const path = require('path');

let injectionType = "post";

if (!hexo.config.image_lazy || !hexo.config.image_lazy.enable) return;

const observerStr = fs.readFileSync(path.join(__dirname, './libs/observer.js'));

/* registry html content processor */
if (hexo.config.image_lazy.type === 'post') {
  hexo.extend.filter.register(
    'after_post_render',
    require('./libs/processor.js').postProcessor
  );
} else {
  injectionType = 'page';
  hexo.extend.filter.register(
    'after_render:html',
    require('./lib/processor.js').htmlProcessor
  );
}

/* registry scroll listener */
hexo.extend.injector.register('body_end', function() {
  const script = `
    <script>
      ${observerStr}
    </script>`;

  return script;
}, injectionType)