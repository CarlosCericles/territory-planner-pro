-- Crear enum para roles de la aplicación
CREATE TYPE public.app_role AS ENUM ('admin', 'publicador');

-- Crear enum para estados de territorio
CREATE TYPE public.territorio_estado AS ENUM ('pendiente', 'iniciado', 'completado');

-- Tabla de roles de usuario (crítico: separada de profiles para evitar escalada de privilegios)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'publicador',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de territorios
CREATE TABLE public.territorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL UNIQUE,
    nombre TEXT,
    geometria_poligono JSONB NOT NULL,
    estado territorio_estado NOT NULL DEFAULT 'pendiente',
    ultima_fecha_completado TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de observaciones/pines
CREATE TABLE public.observaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    territorio_id UUID REFERENCES public.territorios(id) ON DELETE CASCADE NOT NULL,
    coordenadas JSONB NOT NULL,
    comentario TEXT NOT NULL,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de zonas rurales
CREATE TABLE public.zonas_rurales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    geometria JSONB NOT NULL,
    notas TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas_rurales ENABLE ROW LEVEL SECURITY;

-- Función helper: verificar si usuario tiene un rol específico (SECURITY DEFINER para evitar recursión)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Función helper: verificar si usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_territorios_updated_at
    BEFORE UPDATE ON public.territorios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_zonas_rurales_updated_at
    BEFORE UPDATE ON public.zonas_rurales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    -- Asignar rol de publicador por defecto
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'publicador');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies para user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.is_admin(auth.uid()));

-- RLS Policies para profiles
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies para territorios
CREATE POLICY "Authenticated users can view all territories"
    ON public.territorios FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can create territories"
    ON public.territorios FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update territories"
    ON public.territorios FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete territories"
    ON public.territorios FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies para observaciones
CREATE POLICY "Authenticated users can view observations"
    ON public.observaciones FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create their own observations"
    ON public.observaciones FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own observations"
    ON public.observaciones FOR UPDATE
    TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own observations or admins can delete any"
    ON public.observaciones FOR DELETE
    TO authenticated
    USING (auth.uid() = usuario_id OR public.is_admin(auth.uid()));

-- RLS Policies para zonas_rurales
CREATE POLICY "Authenticated users can view rural zones"
    ON public.zonas_rurales FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can create rural zones"
    ON public.zonas_rurales FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update rural zones"
    ON public.zonas_rurales FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete rural zones"
    ON public.zonas_rurales FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Vista para observaciones (oculta usuario_id para no-admins)
CREATE VIEW public.observaciones_publicas
WITH (security_invoker = on)
AS
SELECT 
    id,
    territorio_id,
    coordenadas,
    comentario,
    created_at,
    CASE 
        WHEN public.is_admin(auth.uid()) OR usuario_id = auth.uid() 
        THEN usuario_id 
        ELSE NULL 
    END as usuario_id
FROM public.observaciones;

-- Índices para mejorar performance
CREATE INDEX idx_territorios_estado ON public.territorios(estado);
CREATE INDEX idx_territorios_numero ON public.territorios(numero);
CREATE INDEX idx_territorios_ultima_fecha ON public.territorios(ultima_fecha_completado);
CREATE INDEX idx_observaciones_territorio ON public.observaciones(territorio_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);