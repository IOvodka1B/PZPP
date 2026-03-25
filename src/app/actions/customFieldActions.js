"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Dodaje lub aktualizuje niestandardowe pole (Custom Field) dla konkretnego Leada.
 * @param {string} leadId - ID leada, do którego przypisujemy pole.
 * @param {string} name - Nazwa pola (np. "Budżet").
 * @param {string} value - Wartość pola (np. "50.000 PLN").
 */
export async function upsertCustomField(leadId, name, value) {
  try {
    if (!leadId || !name) {
      return { success: false, error: "ID leada oraz nazwa pola są wymagane." };
    }

    // Używamy upsert, żeby uniknąć duplikatów nazw pól dla jednego leada
    
    const field = await prisma.customField.upsert({
      where: {
        leadId_name: {
          leadId: leadId,
          name: name,
        },
      },
      update: {
        value: value,
      },
      create: {
        leadId: leadId,
        name: name,
        value: value,
      },
    });

    // Odświeżamy ścieżkę widoku szczegółów leada, aby dane były aktualne
    revalidatePath(`/crm/lead/${leadId}`);
    
    return { success: true, data: field };
  } catch (error) {
    console.error("Błąd podczas operacji na Custom Field:", error);
    return { success: false, error: "Nie udało się zapisać pola niestandardowego." };
  }
}

/**
 * Usuwa pole niestandardowe.
 */
export async function deleteCustomField(fieldId, leadId) {
  try {
    await prisma.customField.delete({
      where: { id: fieldId },
    });
    
    revalidatePath(`/crm/lead/${leadId}`);
    return { success: true };
  } catch (error) {
    console.error("Błąd podczas usuwania Custom Field:", error);
    return { success: false, error: "Błąd podczas usuwania pola." };
  }
}