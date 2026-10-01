/* eslint-env browser */
(function (wp) {
  wp.blocks.registerBlockType('sf3d/shoe-finder', {
    edit: window.SF3DBlock.edit,
    save: window.SF3DBlock.save,
  });
})(window.wp);
