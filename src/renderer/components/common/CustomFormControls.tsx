import { useId, useRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { FiCheckSquare, FiChevronDown } from 'react-icons/fi';

export type DropdownOption = {
  id: string;
  label: string;
  description?: string;
};

type CustomDropdownProps = {
  label: string;
  options: DropdownOption[];
  value: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (value: string) => void;
  placeholder?: string;
};

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
};

type TextInputProps = {
  label: string;
  icon?: ReactNode;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

type TextTextareaProps = {
  label: string;
  hint?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const FormField = ({ label, htmlFor, hint, icon, children }: FormFieldProps) => (
  <label className="custom-field" htmlFor={htmlFor}>
    <span className="custom-field__label">{label}</span>
    <span className={`custom-field__control${icon ? ' has-icon' : ''}`}>
      {icon ? <span className="custom-field__icon">{icon}</span> : null}
      {children}
    </span>
    {hint ? <span className="custom-field__hint">{hint}</span> : null}
  </label>
);

export const TextInput = ({ label, icon, hint, id, className, ...props }: TextInputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField label={label} htmlFor={inputId} hint={hint} icon={icon}>
      <input id={inputId} className={`custom-field__input${className ? ` ${className}` : ''}`} {...props} />
    </FormField>
  );
};

export const TextTextarea = ({ label, hint, id, className, ...props }: TextTextareaProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField label={label} htmlFor={inputId} hint={hint}>
      <textarea id={inputId} className={`custom-field__textarea${className ? ` ${className}` : ''}`} {...props} />
    </FormField>
  );
};

export const CustomDropdown = ({
  label,
  options,
  value,
  isOpen,
  onOpenChange,
  onChange,
  placeholder = 'Select an option',
}: CustomDropdownProps) => {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.id === value);

  return (
    <div className={`custom-field custom-dropdown${isOpen ? ' is-open' : ''}`}>
      <span className="custom-field__label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        id={`${listId}-trigger`}
        className={`custom-dropdown__trigger${isOpen ? ' is-open' : ''}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${listId}-label`}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="custom-dropdown__value">
          <strong>{selectedOption?.label ?? placeholder}</strong>
          {selectedOption?.description ? <small>{selectedOption.description}</small> : null}
        </span>
        <FiChevronDown aria-hidden="true" size={16} />
      </button>

      {isOpen ? (
        <div className="custom-dropdown__menu" role="listbox" aria-labelledby={`${listId}-label`}>
          {options.map((option) => {
            const selected = option.id === value;

            return (
              <button
                className={`custom-dropdown__option${selected ? ' is-selected' : ''}`}
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.id);
                  onOpenChange(false);
                  triggerRef.current?.focus();
                }}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
                {selected ? <FiCheckSquare aria-hidden="true" size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
