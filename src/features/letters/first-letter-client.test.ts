import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitFirstLetter } from './first-letter-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitFirstLetter', () => {
  it('posts the first letter using the API contract', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { status: 201 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitFirstLetter({
      receiverId: 'receiver-id',
      subject: '你好',
      body: '很高兴认识你。',
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/penpal-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        receiver_id: 'receiver-id',
        subject: '你好',
        body: '很高兴认识你。',
      }),
    });
  });

  it('returns field errors from a validation response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'validation_error',
              message: '请求参数无效',
              details: {
                subject: '主题不能超过 80 个字符',
              },
            },
          }),
          { status: 400 },
        ),
      ),
    );

    const result = await submitFirstLetter({
      receiverId: 'receiver-id',
      subject: '你好',
      body: '很高兴认识你。',
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        subject: '主题不能超过 80 个字符',
      },
      formError: undefined,
    });
  });

  it('uses the API message for a business error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'business_rule_violation',
              message: '已经有一封等待回应的信了',
              details: {},
            },
          }),
          { status: 422 },
        ),
      ),
    );

    const result = await submitFirstLetter({
      receiverId: 'receiver-id',
      subject: '你好',
      body: '很高兴认识你。',
    });

    expect(result).toEqual({
      ok: false,
      errors: undefined,
      formError: '已经有一封等待回应的信了',
    });
  });

  it('falls back to a friendly message when the response is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response('Internal Server Error', { status: 500 }),
      ),
    );

    const result = await submitFirstLetter({
      receiverId: 'receiver-id',
      subject: '你好',
      body: '很高兴认识你。',
    });

    expect(result).toEqual({
      ok: false,
      errors: undefined,
      formError: '暂时无法寄出这封信，请稍后重试。',
    });
  });
});
