import React, { useCallback, useEffect } from 'react';

export default function Modal() {
  const catchImgClick = useCallback(function(e) {
    if (!this.classList.contains('click-disable')) {
      e && e.stopPropagation();
      const $img = this.cloneNode();
      document.querySelector('#websiteModal').classList.remove('hide');
      $img.classList.add('click-disable')
      document.querySelector('#websiteModal .modal-body').innerHTML = '';
      document.querySelector('#websiteModal .modal-body').append($img);
    } else {
      e && e.stopPropagation();
    }
  }, []);

  const catchModalClick = useCallback(function() {
    document.querySelector('#websiteModal').classList.add('hide');
  }, []);

  useEffect(() => {
    const removeEventImg = window.eventDelegate('document', 'click', 'img', catchImgClick);
    const removeEventModal = window.eventDelegate('document', 'click', '.modal-body', catchModalClick);
    return () => {
      removeEventImg();
      removeEventModal();
    };
  }, []);

  return (
    <div className="modal fade" id="websiteModal" tabindex="-1" role="dialog" aria-labelledby="websiteModalTitle" aria-hidden="true">
      <div className="modal-body"></div>
    </div>
  );
}
