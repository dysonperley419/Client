import { type ReactNode, useState } from 'react';

import { ModalContext, type ModalDataMap, type ModalType } from './modalContext';
import { ModalRoot } from './modalRoot';

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [modalData, setModalData] = useState<ModalDataMap[ModalType] | null>(null);

  const openModal = <T extends ModalType>(
    ...args: ModalDataMap[T] extends undefined ? [type: T] : [type: T, data: ModalDataMap[T]]
  ) => {
    const [type, data] = args;
    setModalType(type);
    setModalData(data ?? null);
  };

  const updateModal = <T extends ModalType>(data: Partial<ModalDataMap[T]>) => {
    setModalData((prev: any) => ({
      ...prev,
      ...data,
    }));
  };

  const closeModal = () => {
    setModalType(null);
    setModalData(null);
  };

  return (
    <ModalContext value={{ modalType, modalData, openModal, updateModal, closeModal }}>
      {children}
      {modalType && <ModalRoot />}
    </ModalContext>
  );
};
