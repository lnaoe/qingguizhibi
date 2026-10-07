import { describe, expect, it } from 'vitest';
import { validateCreateFirstContact } from './validation';

describe('validateCreateFirstContact', () => {
  it('requires a receiver', () => {
    const result = validateCreateFirstContact({
      subject: '你好',
      body: '很高兴认识你。',
    });

    expect(result).toEqual({
      ok: false,
      errors: { receiver_id: '请选择收件人' },
    });
  });

  it('reuses the letter draft validation for subject and body', () => {
    const result = validateCreateFirstContact({
      receiver_id: 'receiver-id',
      subject: '',
      body: '',
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors.subject).toBe('请写下这封信的主题');
      expect(result.errors.body).toBe('请写下想对这个人说的话');
    }
  });

  it('rejects a malformed payload', () => {
    const result = validateCreateFirstContact(null);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors.receiver_id).toBe('请选择收件人');
      expect(result.errors.subject).toBe('请写下这封信的主题');
      expect(result.errors.body).toBe('请写下想对这个人说的话');
    }
  });

  it('trims and returns normalized values', () => {
    const result = validateCreateFirstContact({
      receiver_id: '  receiver-id  ',
      subject: '  你好  ',
      body: '  很高兴认识你。  ',
    });

    expect(result).toEqual({
      ok: true,
      values: {
        receiverId: 'receiver-id',
        subject: '你好',
        body: '很高兴认识你。',
      },
    });
  });
});
