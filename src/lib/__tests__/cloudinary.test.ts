import {
  validateImageFile,
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from '../cloudinary';

/** File of `bytes` length with the given MIME type. */
function fileOf(bytes: number, type: string) {
  return new File([new Uint8Array(bytes)], 'q.img', { type });
}

describe('validateImageFile (trust boundary)', () => {
  it.each(ALLOWED_IMAGE_TYPES)('accepts %s under the size cap', (type) => {
    expect(validateImageFile(fileOf(1024, type))).toBeNull();
  });

  it('accepts a file exactly at the cap', () => {
    expect(validateImageFile(fileOf(MAX_IMAGE_BYTES, 'image/png'))).toBeNull();
  });

  it('rejects a file one byte over the cap', () => {
    expect(validateImageFile(fileOf(MAX_IMAGE_BYTES + 1, 'image/png'))).toBe(
      'Image must not exceed 4MB'
    );
  });

  it('rejects an empty file', () => {
    expect(validateImageFile(fileOf(0, 'image/png'))).toBe('Image file is empty');
  });

  it.each(['application/pdf', 'image/svg+xml', 'text/html', ''])(
    'rejects type %p',
    (type) => {
      expect(validateImageFile(fileOf(1024, type))).toBe(
        'Image must be JPEG, PNG or WebP'
      );
    }
  );
});
