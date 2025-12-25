import { useState, useEffect } from "react";

import { useUnit } from "effector-react";

import { studentModel } from "@entities";
import { notificationsModel } from "@shared";
import type { Student } from "@shared";

import type { StudentFormData } from "./types";

export const useStudentForm = (student?: Student, onClose?: () => void, open?: boolean) => {
  const isLoading = useUnit(studentModel.$isStudentsLoading);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    contactMethod: "WHATSAPP",
    parentPhone: "",
    parentName: "",
    parentContactMethod: "WHATSAPP",
    telegramNick: "",
    parentTelegramNick: "",
    phone: "",
    hourlyRate: "",
    grade: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (student) {
        setFormData({
          name: student.name || "",
          contactMethod: student.contactMethod || "WHATSAPP",
          parentPhone: student.parentPhone || "",
          parentName: student.parentName || "",
          parentContactMethod: student.parentContactMethod || "WHATSAPP",
          telegramNick: student.telegramNick || "",
          parentTelegramNick: student.parentTelegramNick || "",
          phone: student.phone || "",
          hourlyRate: student.hourlyRate?.toString() || "",
          grade: student.grade?.toString() || "",
          notes: student.notes || "",
        });
      } else {
        setFormData({
          name: "",
          contactMethod: "WHATSAPP",
          parentPhone: "",
          parentName: "",
          parentContactMethod: "WHATSAPP",
          telegramNick: "",
          parentTelegramNick: "",
          phone: "",
          hourlyRate: "",
          grade: "",
          notes: "",
        });
      }
    }
  }, [open, student]);

  const handleChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleGradeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      grade: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      notificationsModel.showNotification({
        type: "error",
        message: "Имя студента обязательно для заполнения",
      });
      return false;
    }
    return true;
  };

  const prepareStudentData = () => ({
    name: formData.name.trim(),
    contactMethod: formData.contactMethod,
    telegramNick: formData.telegramNick?.trim() || "",
    parentPhone: formData.parentPhone?.trim() || "",
    parentName: formData.parentName?.trim() || "",
    parentContactMethod: formData.parentContactMethod || undefined,
    parentTelegramNick: formData.parentTelegramNick?.trim() || "",
    phone: formData.phone.trim() || "",
    hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
    grade: formData.grade && formData.grade !== "" ? parseInt(formData.grade, 10) : null,
    notes: formData.notes.trim() || "",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      const studentData = prepareStudentData();

      if (student) {
        studentModel.updateStudent({ id: student.id, data: studentData });
      } else {
        // For creation, don't send empty strings - use undefined
        const createData = {
          name: studentData.name,
          contactMethod: studentData.contactMethod || undefined,
          telegramNick: studentData.telegramNick || undefined,
          parentPhone: studentData.parentPhone || undefined,
          parentName: studentData.parentName || undefined,
          parentTelegramNick: studentData.parentTelegramNick || undefined,
          parentContactMethod: studentData.parentContactMethod || undefined,
          phone: studentData.phone || undefined,
          hourlyRate: studentData.hourlyRate || undefined,
          grade: studentData.grade || undefined,
          notes: studentData.notes || undefined,
        };
        studentModel.addStudent(createData);
      }
    } catch (error) {
      console.error("Student form submit error:", error);
    }
  };

  const handleDeleteStudent = () => {
    if (!student) return;
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!student) return;

    try {
      studentModel.removeStudent(student.id);
      setDeleteDialogOpen(false);
    } catch (error) {
      notificationsModel.showNotification({
        type: "error",
        message: "Ошибка при удалении студента",
      });
      setDeleteDialogOpen(false);
    }
  };

  return {
    formData,
    isLoading,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleChange,
    handleGradeChange,
    handleSubmit,
    handleDeleteStudent,
    handleDeleteConfirm,
  };
};
