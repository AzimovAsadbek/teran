import type { PaymentOptionDto } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { ChoiceCard } from '@/components/checkout/choice-card';
import { ProviderMark } from './payment-ui';

export function PaymentMethodCard({
  option,
  name,
  checked,
  onChange,
  invalid,
}: {
  option: PaymentOptionDto;
  name: string;
  checked: boolean;
  onChange: () => void;
  invalid?: boolean;
}) {
  const t = useTranslations('Checkout');
  const { method, availability } = option;
  return (
    <ChoiceCard
      name={name}
      value={method}
      checked={checked}
      onChange={onChange}
      invalid={invalid}
      disabled={availability === 'unavailable'}
      title={<ProviderMark method={method} name={t(`paymentMethods.${method}`)} />}
      aside={availability === 'live' ? undefined : t(`paymentAvailability.${availability}`)}
      description={t(`paymentDescriptions.${method}`)}
    />
  );
}
