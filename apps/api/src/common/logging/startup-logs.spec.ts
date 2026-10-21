import { withQuietStartUp } from './startup-logs.js';

describe('quiet start-up', () => {
  function logger() {
    const inner = { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    return { inner, quiet: withQuietStartUp(inner) };
  }

  it("lowers Nest's module and route listing to debug", () => {
    const { inner, quiet } = logger();
    quiet.log('Mapped {/api/v1/catalog/products, GET} route', 'RouterExplorer');
    quiet.log('CatalogModule dependencies initialized', 'InstanceLoader');
    expect(inner.debug).toHaveBeenCalledTimes(2);
    expect(inner.log).not.toHaveBeenCalled();
  });

  it('leaves everything else as it was', () => {
    const { inner, quiet } = logger();
    quiet.log({ mode: 'demo' }, 'Payments: DEMO mode', 'PaymentConfig');
    quiet.log('Starting Nest application...', 'NestFactory');
    quiet.warn('Ignoring invalid site setting', 'SettingsService');
    quiet.error('boom', 'RouterExplorer');
    expect(inner.log).toHaveBeenCalledTimes(2);
    expect(inner.log).toHaveBeenCalledWith(
      { mode: 'demo' },
      'Payments: DEMO mode',
      'PaymentConfig',
    );
    expect(inner.warn).toHaveBeenCalledOnce();
    // Errors are never lowered, whoever reports them.
    expect(inner.error).toHaveBeenCalledWith('boom', 'RouterExplorer');
  });
});
