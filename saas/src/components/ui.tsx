import { useCatalog } from '../catalog';
import { isUndefinedColor, ralHex, WOOD_GRADIENTS } from '../constants';
import { useI18n } from '../i18n';
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({
  title,
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; variant?: BtnVariant }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`.trim()} {...rest}>
      {title}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="section-title">{children}</h2>;
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" {...props} />;
}

export function Select({
  label,
  options,
  placeholder,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[] | string[];
  placeholder?: string;
}) {
  const { t } = useI18n();
  const ph = placeholder ?? t('common.select');
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o || ph } : o));
  const select = (
    <select className="input select" {...rest}>
      {items.map((item) => (
        <option key={item.value || 'empty'} value={item.value}>
            {item.label || ph}
        </option>
      ))}
    </select>
  );
  if (!label) return select;
  return (
    <label className="field">
      <span className="label">{label}</span>
      {select}
    </label>
  );
}

export function ColorSwatch({ value, size = 36 }: { value: string; size?: number }) {
  const catalog = useCatalog();
  const wood = WOOD_GRADIENTS[value];
  const hex = catalog.colorHex(value) || ralHex(value);
  const undefinedColor = isUndefinedColor(value);
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: size * 0.22,
    background: wood ? `linear-gradient(135deg, ${wood[0]}, ${wood[1]}, ${wood[2]})` : undefinedColor ? '#2A2A2E' : hex || '#fff',
  };
  return (
    <span className="swatch" style={style}>
      {undefinedColor ? '?' : null}
    </span>
  );
}
