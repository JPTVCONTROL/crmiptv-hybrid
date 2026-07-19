import { prisma } from '../config/database.js';

export const usuarioRepository = {
  findByEmail(email: string) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  findById(id: number) {
    return prisma.usuario.findUnique({ where: { id } });
  },

  create(data: { email: string; nome: string; passwordHash: string }) {
    return prisma.usuario.create({ data });
  },

  updatePassword(id: number, passwordHash: string) {
    return prisma.usuario.update({
      where: { id },
      data: { passwordHash },
    });
  },
};
