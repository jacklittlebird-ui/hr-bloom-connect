UPDATE public.employees SET gender = 'ذكر' WHERE gender IN ('male','Male','MALE');
UPDATE public.employees SET gender = 'أنثى' WHERE gender IN ('female','Female','FEMALE','انثى','انثي','أنثي');